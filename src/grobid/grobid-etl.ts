import _ from 'lodash';

import {
  findElement,
  findElements,
  findElementText,
  JSElement,
  xmlStringToJSDocument
} from './js-xml-elems';

import * as E from 'fp-ts/lib/Either';

import { OpenReviewQueries } from '~/openreview/openreview-queries';
import { levenshteinDistance, Costs } from '~/util/leven';
import { ContentFlags } from '~/app/pipeline';
import { prettyPrint } from '~/util/pretty-print';

export interface OpenReviewAuthor {
  name: string;
  id: string;
  nameMatch: number;
}

export interface OpenReviewNote {
  id: string;
  title: string;
  authors: OpenReviewAuthor[];
  // authors: string[];
  // authorids: string[];

  // Measure similarity to title found by grobid
  titleMatch: number;
}

export interface Person {
  first?: string;
  middle?: string;
  last: string;
}

export interface Reference {
  analytic?: Analytic;
  monograph?: Monograph;
}

export interface Analytic {
  title?: string;
  authors: Person[];
}

export interface Monograph {
  title?: string;
  authors: Person[];
}

export interface ReferenceContext {
  reference: Reference;
  refNumber: number;
  title: string; // the canonical title as given by grobid
  authors: string[]; // the canonical author list as given by grobid
  warnings: string[];
  isValid: boolean; // set to false if extracted data is not valid
  matchingNotes?: OpenReviewNote[];
  source: JSElement;
}

// Keep track of a few stats for the full bibliography
export interface BibliographyStats {
  referenceCount: number;
  withTitles: number;
  withAuthors: number;
  withMatchingNotes: number;
}

export function getReferenceTitle(ref: Reference): string | undefined {
  const title = ref?.analytic?.title || ref?.monograph?.title;
  return title;
}

export function getReferenceAuthors(ref: Reference): Person[] | undefined {
  const authors =
    ref?.analytic?.authors ||
    ref?.monograph?.authors ||
    [];

  return authors;
}

/**
 * performs a simple mapping of xml -> json, but the output is very verbose
 * and not easy or useful to work with, so we remap the keys/values
 */
export function gbdXmlToReferences(grobidXml: string): E.Either<string[], ReferenceContext[]> {

  const docOrErr = xmlStringToJSDocument(grobidXml);
  if (E.isLeft(docOrErr)) {
    const errors = docOrErr.left;
    errors.push('Grobid returned XML (first 100 chars)');
    errors.push(' >' + grobidXml.substring(0, 100));

    return E.left(errors);
  }

  const biblio = docOrErr.right;
  const rootElem = biblio.elements[0];

  const rawRefs = findElements(rootElem, n => n.name === 'biblStruct');

  const refs: ReferenceContext[] = rawRefs
    .flatMap(rawRef => {
      const maybeRef = gbdToReference(rawRef)
      return maybeRef ? [maybeRef] : [];
    })

  return E.right(refs);
}

export function gbdToReference(jsElem: JSElement): ReferenceContext {
  const analytic = gbdToAnalytic(jsElem);
  const monograph = gbdToMonograph(jsElem);

  const reference: Reference = {
    analytic,
    monograph
  };

  const refContext: ReferenceContext = {
    reference,
    refNumber: -1,
    title: '',
    authors: [],
    warnings: [],
    isValid: true,
    source: jsElem
  }

  return refContext;
}

/**
 * Convert a Grobid person element
 */
export function gbdToPerson(persElem: JSElement): Person | undefined {
  const surname = findElementText(persElem, (n) => n.name === 'surname');
  if (!surname) return;

  const first = findElementText(persElem, (n) => n.name === 'forename', (attrs) => attrs.type === 'first');
  const middle = findElementText(persElem, (n) => n.name === 'forename', (attrs) => attrs.type === 'middle');

  return { first, middle, last: surname }
}

/**
 * Convert a Grobid Analytic element
 */
export function gbdToAnalytic(jsElem: JSElement): Analytic | undefined {
  const analytic = findElement(jsElem, (n) => n.name === 'analytic');
  if (!analytic) {
    return;
  }

  const title = findElementText(analytic, (n) => n.name === 'title');
  const authorElems = analytic ? findElements(analytic, (n) => n.name === 'author') : [];
  const authors = authorElems
    .flatMap(author => {
      const person = gbdToPerson(author);
      return person ? [person] : []
    });

  return {
    title,
    authors
  };
}

/**
 * Convert a Grobid Monograph element
 */
export function gbdToMonograph(jsElem: JSElement): Monograph | undefined {
  const monogr = findElement(jsElem, (n) => n.name === 'monogr');
  if (!monogr) {
    return;
  }
  const title = findElementText(monogr, (n) => n.name === 'title');
  const authorElems = monogr ? findElements(monogr, (n) => n.name === 'author') : [];
  const authors = authorElems
    .flatMap(author => {
      const person = gbdToPerson(author);
      return person ? [person] : []
    });

  return {
    title,
    authors
  };
}

function percentDiff(s1: string, s2: string, costs: Partial<Costs>): number {
  const dist = levenshteinDistance(s1.toLowerCase(), s2.toLowerCase(), costs);
  const ubound = Math.max(s1.length, s2.length);
  const unchanged = (ubound - dist)
  const ratio = unchanged / ubound;
  const perc = Math.round(ratio * 100)
  return perc;
}

function titleDiff(s1: string, s2: string): number {
  return percentDiff(s1, s2, {});
}

// Try to minimize difference between abbreviated author name (e.g., A. M. Smith)
// and full author name by allowing no-cost deletions from longer name to shorter version,
// ignoring whitespace
function authorDiff(st1: string, st2: string): number {
  const s1 = st1.replace(/[  ]+/g, '');
  const s2 = st2.replace(/[  ]+/g, '');
  if (s1.length > s2.length) {
    return percentDiff(s1, s2, { del: 0 });
  }
  return percentDiff(s2, s1, { del: 0 });
}

/**
 * Attempt to find matching papers in openreview
 */
export async function runOpenReviewQueries(refContexts: ReferenceContext[], orQueries: OpenReviewQueries) {
  for await (const ctx of refContexts) {
    const ref = ctx.reference;
    const grobidTitle = getReferenceTitle(ref);
    const grobidAuthors = getReferenceAuthors(ref) || [];

    if (grobidTitle === undefined || grobidTitle.length === 0) {
      ctx.warnings.push('Error querying Openreview: No title');
      continue;
    }

    const results = await orQueries.queryNotesForTitle({ term: `"${grobidTitle}"`, source: 'forum', limit: 3 });
    const noteList: any[] = results.notes;
    const notes: OpenReviewNote[] = noteList.map(note => {
      const { id } = note;
      const { title, authors, authorids } = note.content;
      const authorCount = Math.max(authors.length, authorids.length);
      const authorRecs = _.map(_.range(authorCount), (i: number) => {
        const name = i < authors.length ? authors[i] : '';
        const id = i < authorids.length ? authorids[i] : '';
        const grobidAuthor = i < grobidAuthors.length ? grobidAuthors[i] : undefined;
        const nameMatch = grobidAuthor ? authorDiff(formatPerson(grobidAuthor), name) : 0;
        const author: OpenReviewAuthor = {
          name, id, nameMatch
        };
        return author;
      });

      return <OpenReviewNote>{
        id,
        title,
        authors: authorRecs
      };
    });
    ctx.matchingNotes = notes;
  }
}

function includeAll(flags: ContentFlags): boolean {
  const { withMatched, withPartialMatched, withUnmatched } = flags;
  const bools = [withMatched, withPartialMatched, withUnmatched];
  const allTrue = _.every(bools);
  const allFalse = !_.some(bools);
  // prettyPrint({ flags, allTrue, allFalse })
  return allTrue || allFalse;
}

function includeMatched(flags: ContentFlags): boolean {
  const { withMatched } = flags;
  return includeAll(flags) || withMatched;
}

function includePartialMatched(flags: ContentFlags): boolean {
  const { withPartialMatched } = flags;
  return includeAll(flags) || withPartialMatched;
}

function includeUnmatched(flags: ContentFlags): boolean {
  const { withUnmatched } = flags;
  return includeAll(flags) || withUnmatched;
}

export function createJsonFormatOutput(
  biblioStats: BibliographyStats,
  refContexts: ReferenceContext[],
  flags: ContentFlags
): object {

  const biblioSummary = {
    references: biblioStats.referenceCount,
    withTitles: biblioStats.withTitles,
    withNoteMatches: biblioStats.withMatchingNotes
  };

  const references = refContexts.map((ctx) => {
    const { matchingNotes, isValid, warnings } = ctx;
    if (!isValid && includeUnmatched(flags)) {
      return {
        isValid,
        warnings
      };
    }

    const { title, authors, refNumber } = ctx;

    let isPartialMatch = false;

    const resultRec: any = {
      refNumber,
      title,
      authors,
      isValid,
      warnings
    };


    if (!matchingNotes) {
      warnings.push('OpenReview title matching was not run');
    } else {
      resultRec.openreviewMatches = matchingNotes
        .filter(note => note.titleMatch >= 95)
        .map(note => {
          const partialTitleMatch = note.titleMatch < 100;
          isPartialMatch ||= partialTitleMatch;

          const partialNameMatch = _.some(note.authors, a => {
            return a.nameMatch < 100;
          });
          isPartialMatch ||= partialNameMatch;

          const matchRec: any = {
            id: note.id,
            authors: note.authors,
            titleMatch: note.titleMatch
          };
          if (note.titleMatch < 100) {
            matchRec.title = note.title;
          }
          return matchRec;
        });
    }

    const haveMatches = resultRec.openreviewMatches.length > 0;
    let finalResult: any = includeAll(flags) ? resultRec : undefined;

    if (haveMatches && includeMatched(flags)) {
      finalResult = resultRec;
    }
    if (isPartialMatch && includePartialMatched(flags)) {
      finalResult = resultRec;
    }
    if (!haveMatches && includeUnmatched(flags)) {
      finalResult = resultRec;
    }

    return finalResult;
  });

  const filtered = _.filter(references, r => r !== undefined);

  return {
    summary: biblioSummary,
    references: filtered
  };
}

function formatPerson(p: Person): string {
  const nameparts = [
    p.first,
    p.middle,
    p.last
  ].filter(n => n !== undefined);
  return nameparts.join(' ');
}

export async function summarizeReferences(refContexts: ReferenceContext[]): Promise<BibliographyStats> {
  const biblioStats: BibliographyStats = {
    referenceCount: refContexts.length,
    withTitles: 0,
    withAuthors: 0,
    withMatchingNotes: 0,
  };

  refContexts.forEach((ctx, refNum) => {
    const ref = ctx.reference;
    ctx.refNumber = refNum;
    const titleOrUndef = getReferenceTitle(ref);
    if (titleOrUndef) {
      biblioStats.withTitles += 1;
      const title = ctx.title = titleOrUndef;

      const { matchingNotes } = ctx;
      if (!matchingNotes || matchingNotes.length === 0) {
        return;
      }
      biblioStats.withMatchingNotes += 1;

      matchingNotes.forEach(note => {
        const diff = titleDiff(note.title, title);
        note.titleMatch = diff;
      });
    } else {
      ctx.title = '';
      ctx.warnings.push('Grobid: no title found');
      ctx.isValid = false;
    }

    const authors = getReferenceAuthors(ref);

    if (authors && authors.length > 0) {
      biblioStats.withAuthors += authors.length === 0 ? 0 : 1;
      const authorNameList = authors.map(formatPerson);

      ctx.authors.push(...authorNameList);
    } else {
      ctx.warnings.push('Grobid: no authors found');
    }
  });

  return biblioStats;
}
