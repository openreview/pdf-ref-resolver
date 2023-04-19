import { prettyPrint, putStrLn } from '~/util/pretty-print';

import {
  findElement,
  findElements,
  findElementText,
  JSElement,
  xmlStringToJSDocument
} from './js-xml-elems';

import * as E from 'fp-ts/lib/Either';

import { OpenReviewQueries } from '~/openreview/openreview-queries';
import { warn } from 'console';
import { ConfigType } from '~/util/config';

export interface OpenReviewNote {
  id: string;
  title: string;
  authors: string[];
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
  matchingNotes?: OpenReviewNote[];
  source: JSElement;
  reportText: string[];
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

export function gbdXmlToReferences(grobidXml: string): E.Either<string[], ReferenceContext[]> {
  // performs a simple mapping of xml -> json, but the output is very verbose
  // and not easy or useful to work with, so we remap the keys/values

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
    source: jsElem,
    reportText: []
  }

  return refContext;
}

export function gbdToPerson(persElem: JSElement): Person | undefined {
  const surname = findElementText(persElem, (n) => n.name === 'surname');
  if (!surname) return;

  const first = findElementText(persElem, (n) => n.name === 'forename', (attrs) => attrs.type === 'first');
  const middle = findElementText(persElem, (n) => n.name === 'forename', (attrs) => attrs.type === 'middle');

  return { first, middle, last: surname }
}

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


export async function runOpenReviewQueries(refContexts: ReferenceContext[], config: ConfigType) {
  const orQueries = new OpenReviewQueries(config);

  for await (const ctx of refContexts) {
    const ref = ctx.reference;
    const title = getReferenceTitle(ref);
    if (title === undefined || title.length === 0) {
      putStrLn('No title found in grobid reference');
      continue;
    }
    const results = await orQueries.queryNotesForTitle({ term: `"${title}"`, source: 'forum', limit: 3 });
    const noteList: any[] = results.notes;
    const notes: OpenReviewNote[] = noteList.map(note => {
      const { id } = note;
      const { title, authors } = note.content;
      return <OpenReviewNote>{
        id, title, authors
      };
    });
    ctx.matchingNotes = notes;
  }
}

function putReportLn(refCtx: ReferenceContext, ...msgs: string[]) {
  const msg = msgs.join('')
  refCtx.reportText.push(msg);
}

type OutputOpts = {
  outputFile?: string;
}

export async function createJsonFormatOutput(
  biblioStats: BibliographyStats,
  refContexts: ReferenceContext[],
  // { outputFile  }: OutputOpts
): Promise<object> {

  const leven = (await import('leven')).default;

  function percentDiff(s1: string, s2: string): number {
    const dist = leven(s1.toLowerCase(), s2.toLowerCase());
    const ubound = Math.max(s1.length, s2.length);
    const unchanged = (ubound - dist)
    const ratio = unchanged / ubound;
    const perc = Math.round(ratio * 100)
    return perc;
  }
  const biblioSummary = {
    ReferenceCount: biblioStats.referenceCount,
    WithTitlesCount: biblioStats.withTitles,
    WithNoteMatchesCount: biblioStats.withMatchingNotes
  };

  const references = refContexts.map((ctx) => {
    const ref = ctx.reference;
    const { matchingNotes } = ctx;

    const warnings: string[] = [];
    const resultRec: any = {
      warnings
    };

    const title = getReferenceTitle(ref);
    const authors = getReferenceAuthors(ref);
    if (title) {
      resultRec.title = title;

      if (!matchingNotes) {
        warnings.push('OpenReview title matching was not run');
      } else {
        const matchPercents: [number, string][] = matchingNotes.map(note => {
          const diff = percentDiff(note.title, title);
          const msg = `${note.id} (${diff}% title match)`;
          return [diff, msg];
        });

        const strongMatches = matchPercents
          .filter(([n,]) => n > 95)
          .map(([, diff]) => diff);

        resultRec.openreviewMatches = strongMatches;
      }
    } else {
      warnings.push('No Title Found');
    }

    if (authors && authors.length > 0) {
      const names = authors.map(author => {
        let name = '';
        const { first, middle, last } = author;
        if (first) {
          name += `${first}`;
        }
        if (middle) {
          name += ` ${middle}`;
        }
        if (last) {
          name += ` ${last}`;
        }

        return name.trim();
      });
      resultRec.authors = names;
    } else {
      warnings.push('No Authors Found')
    }
    return resultRec;
  });

  return {
    summary: biblioSummary,
    references
  };
}

export function outputBiblioSummary(
  biblioStats: BibliographyStats,
  refContexts: ReferenceContext[],
): string {
  const biblioSummary = [
    `Reference Count: ${biblioStats.referenceCount}`,
    `   with titles      : ${biblioStats.withTitles}`,
    `   with note matches: ${biblioStats.withMatchingNotes}`,
  ].join('\n');

  const reportBlocks = refContexts.map((ctx) => {
    const report = ctx.reportText.join('\n');
    return report;
  });

  const reports = [
    biblioSummary,
    '',
    reportBlocks.join('\n'),
  ].join('\n')

  return reports;
}

export async function summarizeReferences(refContexts: ReferenceContext[]): Promise<BibliographyStats> {
  const leven = (await import('leven')).default;

  function percentDiff(s1: string, s2: string): number {
    const dist = leven(s1.toLowerCase(), s2.toLowerCase());
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
    const titleOrUndef = getReferenceTitle(ref);
    const authors = getReferenceAuthors(ref);
    const title = titleOrUndef ? titleOrUndef : 'No title found for reference';

    const refMarker = `[${refNum + 1}]`;
    const indent = ' '.repeat(refMarker.length + 1);
    putReportLn(ctx, `${refMarker} ${title}`);

    if (!titleOrUndef) {
      prettyPrint({ source: ctx.source });
      return;
    }
    biblioStats.withTitles += 1;

    if (!authors) {
      putReportLn(ctx, 'No authors found for reference. Source was:')
      prettyPrint({ source: ctx.source });
      return;
    }
    biblioStats.withAuthors += authors.length === 0 ? 0 : 1;

    const authorNameList = authors.map(author => {
      const nameparts = [
        author.first,
        author.middle,
        author.last
      ].filter(n => n !== undefined);
      return nameparts.join(' ');
    });

    if (authorNameList.length === 0) {
      putReportLn(ctx, indent, 'No Authors')
      prettyPrint({ source: ctx.source });
    } else {
      const authorNames = authorNameList.join('; ')
      putReportLn(ctx, indent, authorNames)
    }

    const { matchingNotes } = ctx;

    putReportLn(ctx, indent, '== Matching OpenReview Notes');

    if (!matchingNotes) {
      putReportLn(ctx, indent, '<OpenReview note matching was not run>');
      putReportLn(ctx, '\n');
      return;
    }

    if (matchingNotes.length === 0) {
      putReportLn(ctx, indent, '<No matching OpenReview notes found>');
      putReportLn(ctx, '\n');
      return;
    }

    const matchPercents: [number, string][] = matchingNotes.map(note => {
      const diff = percentDiff(note.title, title);
      const msg = `${note.id} (${diff}% title match)`;
      return [diff, msg];
    });

    const strongMatches = matchPercents
      .filter(([n,]) => n > 95)
      .map(([, diff]) => diff);

    const weakMatches = matchPercents
      .filter(([n,]) => 75 <= n && n <= 95)
      .map(([, diff]) => diff);

    const nonMatches = matchPercents
      .filter(([n,]) => n < 75)
      .map(([, diff]) => diff);

    if (strongMatches.length > 0) {
      putReportLn(ctx, indent, '  === Strong Matches');
      strongMatches.forEach(m => {
        putReportLn(ctx, indent, indent, m);
      })
      biblioStats.withMatchingNotes += 1;
    }

    if (weakMatches.length > 0) {
      putReportLn(ctx, indent, '  === Weak Matches');
      weakMatches.forEach(m => {
        putReportLn(ctx, indent, indent, m);
      });
    }

    if (nonMatches.length > 0) {
      putReportLn(ctx, indent, '  === Non Matching Candidates');
      nonMatches.forEach(m => {
        putReportLn(ctx, indent, indent, m);
      });
    }

    putReportLn(ctx, '\n');
  });

  return biblioStats;
}
