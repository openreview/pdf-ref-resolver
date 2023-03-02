
import {
  registerCmd,
  config,
  opt,
  YArgsT
} from '~/cli/arglib';

import convert from 'xml-js'
import fs from 'fs';
import { prettyPrint } from '~/util/pretty-print';

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
      addParent: true
    })
    const back = asJson.elements[0].elements[1].elements[2]

    prettyPrint({ back })
  });
}



type JSAttrVal = number | boolean | string;
type JSAttributes = Record<string, JSAttrVal>;

export interface JSElement {
  type: string;
  name: string;
  attributes: JSAttributes;
  parent: JSElement;
  elements: JSElement[];
}

export function foldR<A>(
  root: JSElement,
  f: (e: JSElement, as: A[]) => A
) {

}
