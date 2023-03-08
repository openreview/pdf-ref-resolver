import {
  registerCmd,
  config,
  opt,
  YArgsT
} from '~/util/arglib';

import convert from 'xml-js'
import fs from 'fs';
import { prettyPrint } from '~/util/pretty-print';
import { findElement, findElements, getElementText, JSElement, parseJSDocument } from './jselems';
import * as E from 'fp-ts/Either'
import { OpenReviewQueries } from '~/openreview/openreview-queries';

export interface RefRec {
  title: string;
  authorNames: string[];
  source: JSElement;
}

export function transformGrobidXmlToJson(grobidXml: string): E.Either<string[], RefRec[]> {
  // performs a simple mapping of xml -> json, but the output is very verbose
  // and not easy or useful to work with, so we remap the keys/values
  const asJson = convert.xml2js(grobidXml, {
    compact: false,
  });

  const doc = parseJSDocument(asJson);
  if (E.isLeft(doc)) return doc;

  const biblio = doc.right;
  const rootElem = biblio.elements[0];

  const rawRefs = findElements(rootElem, n => n.name === 'biblStruct');

  const refs: RefRec[] = rawRefs
    .flatMap(rawRef => {
      const maybeRef = transformJsonReference(rawRef)
      if (E.isLeft(maybeRef)) {
        prettyPrint({ error: maybeRef.left })
        return [];
      }
      return [maybeRef.right];
    })
    .filter(ref => ref !== undefined);

  return E.right(refs);
}

export function transformJsonReference(jsElem: JSElement): E.Either<string, RefRec> {
  const analytic = findElement(jsElem, (n) => n.name === 'analytic');
  const monogr = findElement(jsElem, (n) => n.name === 'monogr');

  const analyticTitleElem = analytic ? findElement(analytic, (n) => n.name === 'title') : undefined;
  const monogrTitleElem = monogr ? findElement(monogr, (n) => n.name === 'title') : undefined;

  let title: string | undefined;

  if (analyticTitleElem) {
    title = getElementText(analyticTitleElem);
  } else if (monogrTitleElem) {
    title = getElementText(monogrTitleElem);
  }

  const authors = analytic ? findElements(analytic, (n) => n.name === 'author') : undefined;
  let authorNames: string[] = [];
  if (authors) {
    authorNames = authors.map(author => {
      const firstElem = findElement(author, (n) => n.name === 'forename', (attrs) => attrs.type === 'first');
      const middleElem = findElement(author, (n) => n.name === 'forename', (attrs) => attrs.type === 'middle');
      const surnameElem = findElement(author, (n) => n.name === 'surname');
      const first = firstElem ? getElementText(firstElem) : '';
      const middle = middleElem ? getElementText(middleElem) : '';
      const surname = surnameElem ? getElementText(surnameElem) : '';
      const authorName = `${first} ${middle} ${surname}`;
      return authorName;
    });
  }

  title = title || '';


  const reference = {
    title,
    authorNames,
    source: jsElem
  };

  return E.right(reference);
}

export function registerCommands(args: YArgsT) {
  registerCmd(
    args,
    'xml-to-json',
    'Convert Grobid XML data to JSON',
    config(
      opt.env,
      opt.cwd,
      opt.flag('query-openreview'),
      opt.flag('verbose'),
      opt.file('xml'),
    ),
  )(async (args: any) => {
    const { xml, queryOpenreview } = args;


    const xmlInput = fs.readFileSync(xml);
    const grobidJson_ = transformGrobidXmlToJson(xmlInput.toString());
    if (E.isLeft(grobidJson_)) {
      prettyPrint({ error: grobidJson_.left });
      return;
    }

    const grobidRefs = grobidJson_.right;


    if (queryOpenreview) {
      const orQueries = new OpenReviewQueries();

      for await (const ref of grobidRefs) {
        const { title, authorNames } = ref;
        const results = await orQueries.queryNotesForTitle({ term: `"${title}"`, source: 'forum' });
        const notes: any[] = results.notes;
        const noteFields = notes.map(note => {
          const { id } = note;
          const { title, authors } = note.content;
          return {
            id, title, authors
          };
        });
        if (noteFields.length === 0) {
          const widerResults = await orQueries.queryNotesForTitle({ term: title });
          const notes: any[] = widerResults.notes.map((n: any) => n.content);
          prettyPrint({ queryTitle: title, queryAuthors: authorNames, widerResults: notes });
        } else {
          prettyPrint({ queryTitle: title, queryAuthors: authorNames, noteFields });
        }
      }

    }
  });
}
