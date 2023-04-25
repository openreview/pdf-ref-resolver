import {
  findElement,
  findElements,
  findElementText,
  JSElement,
  xmlStringToJSDocument
} from './js-xml-elems';

import * as E from 'fp-ts/lib/Either';

import { OpenReviewQueries } from '~/openreview/openreview-queries';
import { levenshteinDistance } from '~/util/leven';

export interface OpenReviewNote {
  id: string;
  title: string;
  authors: string[];
  authorids: string[];

  // Measure similarity to title found by grobid
  titleMatchPercent: number;
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


/**
 * Attempt to find matching papers in openreview
 */
export async function runOpenReviewQueries(refContexts: ReferenceContext[], orQueries: OpenReviewQueries) {
  for await (const ctx of refContexts) {
    const ref = ctx.reference;
    const title = getReferenceTitle(ref);
    if (title === undefined || title.length === 0) {
      ctx.warnings.push('Error querying Openreview: No title');
      continue;
    }
    const results = await orQueries.queryNotesForTitle({ term: `"${title}"`, source: 'forum', limit: 3 });
    const noteList: any[] = results.notes;
    const notes: OpenReviewNote[] = noteList.map(note => {
      const { id } = note;
      const { title, authors, authorids } = note.content;
      return <OpenReviewNote>{
        id, title, authors, authorids
      };
    });
    ctx.matchingNotes = notes;
  }
}

export function createJsonFormatOutput(
  biblioStats: BibliographyStats,
  refContexts: ReferenceContext[],
): object {

  const biblioSummary = {
    references: biblioStats.referenceCount,
    withTitles: biblioStats.withTitles,
    withNoteMatches: biblioStats.withMatchingNotes
  };

  const references = refContexts.map((ctx) => {
    const { matchingNotes, isValid, warnings } = ctx;
    if (!isValid) {
      return {
        isValid,
        warnings
      };
    }

    const { title, authors } = ctx;

    const resultRec: any = {
      title,
      authors,
      isValid,
      warnings
    };


    if (!matchingNotes) {
      warnings.push('OpenReview title matching was not run');
    } else {
      resultRec.openreviewMatches = matchingNotes
        .filter(note => note.titleMatchPercent >= 95)
        .map(note => {
          const matchRec: any = {
            id: note.id,
            authors: note.authors,
            authorids: note.authorids,
            match: note.titleMatchPercent
          };
          if (note.titleMatchPercent < 100) {
            matchRec.title = note.title;
          }
          return matchRec;
        });
    }

    return resultRec;
  });

  return {
    summary: biblioSummary,
    references
  };
}

export async function summarizeReferences(refContexts: ReferenceContext[]): Promise<BibliographyStats> {
  function percentDiff(s1: string, s2: string): number {
    const dist = levenshteinDistance(s1.toLowerCase(), s2.toLowerCase());
    const ubound = Math.max(s1.length, s2.length);
    const unchanged = (ubound - dist)
    const ratio = unchanged / ubound;
    const perc = Math.round(ratio * 100)
    return perc;
  }

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
        const diff = percentDiff(note.title, title);
        note.titleMatchPercent = diff;
      });
    } else {
      ctx.title = '';
      ctx.warnings.push('Grobid: no title found');
      ctx.isValid = false;
    }

    const authors = getReferenceAuthors(ref);

    if (authors && authors.length > 0) {
      biblioStats.withAuthors += authors.length === 0 ? 0 : 1;
      const authorNameList = authors.map(author => {
        const nameparts = [
          author.first,
          author.middle,
          author.last
        ].filter(n => n !== undefined);
        return nameparts.join(' ');
      });

      ctx.authors.push(...authorNameList);
    } else {
      ctx.warnings.push('Grobid: no authors found');
    }
  });

  return biblioStats;
}
