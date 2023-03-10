
import { prettyPrint, putStrLn } from '~/util/pretty-print';

import {
  findElement,
  findElements,
  findElementText,
  JSElement,
  xmlStringToJSDocument
} from './jselems';

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
}

export function getReferenceTitle(ref: Reference): string | undefined {
  const title = ref?.analytic?.title || ref?.monograph?.title;
  return title;
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
      if (E.isLeft(maybeRef)) {
        prettyPrint({ error: maybeRef.left })
        return [];
      }
      return [maybeRef.right];
    })
    .filter(ref => ref !== undefined);

  return E.right(refs);
}

export function gbdToPerson(persElem: JSElement): Person | undefined {
  const surname = findElementText(persElem, (n) => n.name === 'surname');
  if (!surname) return;

  const first = findElementText(persElem, (n) => n.name === 'forename', (attrs) => attrs.type === 'first');
  const middle = findElementText(persElem, (n) => n.name === 'forename', (attrs) => attrs.type === 'middle');

  return { first, middle, last: surname }
}

export function gbdToAnalytic(jsElem: JSElement): E.Either<string, Analytic> {
  const analytic = findElement(jsElem, (n) => n.name === 'analytic');
  if (!analytic) {
    return E.left('analytic section not found');
  }
  const title = findElementText(analytic, (n) => n.name === 'title');
  const authorElems = analytic ? findElements(analytic, (n) => n.name === 'author') : [];
  const authors = authorElems
    .flatMap(author => {
      const person = gbdToPerson(author);
      return person ? [person] : []
    });

  return E.right({
    title,
    authors
  });
}

export function gbdToMonograph(jsElem: JSElement): E.Either<string, Monograph> {
  const monogr = findElement(jsElem, (n) => n.name === 'monogr');
  if (!monogr) {
    return E.left('monogr section not found');
  }
  const title = findElementText(monogr, (n) => n.name === 'title');

  return E.right({
    title,
  });
}
export function gbdToReference(jsElem: JSElement): E.Either<string, Reference> {

  const analytic = gbdToAnalytic(jsElem);
  const monograph = gbdToMonograph(jsElem);

  const t1 = E.isRight(analytic) ? analytic.right.title : undefined;
  const t2 = E.isRight(monograph) ? monograph.right.title : undefined;
  const title = t1 || t2;

  const authors = E.isRight(analytic) ? analytic.right.authors : [];

  const reference = {
    title,
    authors,
    source: jsElem
  };

  return E.right(reference);
}

export async function runOpenReviewQueries(refs: Reference[]) {
  const orQueries = new OpenReviewQueries();
  const augmentedRefs: Reference[] = [];

  for await (const ref of refs) {
    augmentedRefs.push(ref);
    const title = getReferenceTitle(ref);
    const authors = ref?.analytic?.authors || [];
    if (title === undefined || title.length === 0) {
      putStrLn('No title found in grobid reference');
      return;
    }
    const results = await orQueries.queryNotesForTitle({ term: `"${title}"`, source: 'forum', limit: 3 });
    const noteList: any[] = results.notes;
    const notes: OpenReviewNote[] = noteList.map(note => {
      const { id } = note;
      const { title, authors } = note.content;
      return {
        id, title, authors
      };
    });
    if (notes.length === 0) {
      const widerResults = await orQueries.queryNotesForTitle({ term: title, limit: 3 });
      const notes: any[] = widerResults.notes.map((n: any) => n.content);
      prettyPrint({ queryTitle: title, queryAuthors: authors, widerResults: notes });
    } else {
      ref.matchingNotes = notes;
      prettyPrint({ queryTitle: title, queryAuthors: authors, notes });
    }
  }
}

export function printReferences(refs: Reference[]): void {

}
