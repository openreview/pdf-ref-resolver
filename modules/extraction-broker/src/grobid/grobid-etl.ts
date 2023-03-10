import { prettyPrint, putStrLn } from '~/util/pretty-print';

import {
  findElement,
  findElements,
  findElementText,
  JSElement,
  xmlStringToJSDocument
} from './js-xml-elems';

import * as E from 'fp-ts/Either';

import { OpenReviewQueries } from '~/openreview/openreview-queries';

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
  matchingNotes?: OpenReviewNote[];
  source: JSElement;
}

export interface Analytic {
  title?: string;
  authors: Person[];
}

export interface Monograph {
  title?: string;
  authors: Person[];
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

export function gbdXmlToReferences(grobidXml: string): E.Either<string[], Reference[]> {
  // performs a simple mapping of xml -> json, but the output is very verbose
  // and not easy or useful to work with, so we remap the keys/values

  const docOrErr = xmlStringToJSDocument(grobidXml);
  if (E.isLeft(docOrErr)) return docOrErr;

  const biblio = docOrErr.right;
  const rootElem = biblio.elements[0];

  const rawRefs = findElements(rootElem, n => n.name === 'biblStruct');

  const refs: Reference[] = rawRefs
    .flatMap(rawRef => {
      const maybeRef = gbdToReference(rawRef)
      return maybeRef ? [maybeRef] : [];
    })

  return E.right(refs);
}

export function gbdToReference(jsElem: JSElement): Reference | undefined {

  const analytic = gbdToAnalytic(jsElem);
  const monograph = gbdToMonograph(jsElem);

  const reference: Reference = {
    analytic,
    monograph,
    source: jsElem
  };

  return reference;
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


export async function runOpenReviewQueries(refs: Reference[]) {
  const orQueries = new OpenReviewQueries();

  for await (const ref of refs) {
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
    ref.matchingNotes = notes;
  }
}

export async function printReferences(refs: Reference[]): Promise<void> {
  const leven = (await import('leven')).default;

  refs.forEach((ref, refNum) => {
    const titleOrUndef = getReferenceTitle(ref);
    const authors = getReferenceAuthors(ref);
    const title = titleOrUndef ? titleOrUndef : 'No title found for reference';

    const refMarker = `[${refNum}]`;
    const indent = ' '.repeat(refMarker.length + 1);
    putStrLn(`${refMarker} ${title}`)

    if (!titleOrUndef) {
      prettyPrint({ source: ref.source });
      return;
    }

    if (!authors) {
      putStrLn(`No authors found for reference. Source was:`)
      prettyPrint({ source: ref.source });
      return;
    }

    const authorNameList = authors.map(author => {
      const nameparts = [
        author.first,
        author.middle,
        author.last
      ].filter(n => n !== undefined);
      return nameparts.join(' ');
    });

    if (authorNameList.length === 0) {
      putStrLn(indent, `No Authors`)
      prettyPrint({ source: ref.source });
    } else {
      const authorNames = authorNameList.join('; ')
      putStrLn(indent, authorNames)
    }

    const { matchingNotes } = ref;
    if (!matchingNotes) {
      putStrLn(indent, '<OpenReview note matching was not run>');
      putStrLn('\n');
      return;
    }

    if (matchingNotes.length === 0) {
      putStrLn(indent, '<No matching OpenReview notes found>');
      putStrLn('\n');
      return;
    }

    putStrLn(indent, '== Matching OpenReview notes ==');
    const matches = matchingNotes.map(note => {
      const titleDist = leven(title.toLowerCase(), note.title.toLowerCase());
      const ubound = Math.max(title.length, note.title.length);
      const unchanged = (ubound - titleDist)
      const ratio = unchanged / ubound;
      const perc = Math.round(ratio * 100)
      // putStrLn(`dist: ${title} -> ${note.title}`);
      // putStrLn(`   leven:     ${titleDist}`);
      // putStrLn(`   upper-b:   ${ubound}`);
      // putStrLn(`   unchanged: ${unchanged}`);
      // putStrLn(`   ratio:     ${ratio}`);
      // putStrLn(`   perc:      ${perc}`);
      // putStrLn()

      return `${note.id} (${perc}% match)`;
      // putStrLn('    ', title);
      // putStrLn('    ', authors.join('; '))
    });
    putStrLn(indent, matches.join(', '));
    putStrLn('\n');

  });
}
