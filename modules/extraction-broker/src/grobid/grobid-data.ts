
import {
  registerCmd,
  config,
  opt,
  YArgsT
} from '~/util/arglib';

import convert from 'xml-js'
import fs from 'fs';
import { prettyPrint } from '~/util/pretty-print';
import { findElement, findElements, getElementText } from './jselems';

export function registerCommands(args: YArgsT) {
  registerCmd(
    args,
    'xml-to-json',
    'Convert Grobid XML data to JSON',
    config(
      opt.env,
      opt.cwd,
      opt.file('xml'),
    ),
  )((args: any) => {
    const { xml } = args;

    const xmlInput = fs.readFileSync(xml);
    const asJson = convert.xml2js(xmlInput.toString(), {
      compact: false,
    });

    prettyPrint({asJson})
    const biblStructs = findElements(asJson, n => n.name === 'biblStruct')

    biblStructs.forEach(biblStruct => {

      const analytic = findElement(biblStruct, (n) => n.name === 'analytic');
      const monogr = findElement(biblStruct, (n) => n.name === 'monogr');
      prettyPrint({ analytic, monogr })

      const analyticTitle = analytic ? findElement(analytic, (n) => n.name === 'title') : undefined;
      const monogrTitle = monogr ? findElement(monogr, (n) => n.name === 'title') : undefined;

      const authors = analytic ? findElements(analytic, (n) => n.name === 'author') : undefined;
      let authorNames: string[] = [];
      if (authors) {
        authorNames = authors.map(author => {
          const firstElem = findElement(author, (n) => n.name === 'forename', (attrs) => attrs.type === 'first');
          const middleElem = findElement(author, (n) => n.name === 'forename', (attrs) => attrs.type === 'first');
          const surnameElem = findElement(author, (n) => n.name === 'forename', (attrs) => attrs.type === 'first');
          const first = firstElem? getElementText(firstElem) : '';
          const middle = middleElem? getElementText(middleElem) : '';
          const surname = surnameElem? getElementText(surnameElem) : '';
          const authorName = `${first} ${middle} ${surname}`;
          return authorName;
        });

      }

      const title = analyticTitle || monogrTitle;

      prettyPrint({ title, authorNames })
    });

  });
}
