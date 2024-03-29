import _ from 'lodash';
import df from 'd-forest';
import convert from 'xml-js'
import * as io from 'io-ts';
import * as E from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { prettyPrint } from '~/util/pretty-print';

/**
 * Convert XML into a structured JSON object, and provide functions
 * for searching and traversing the converted JSON
 *
 * + Based on:
 *    + xml-js is a library for converting XML -> JSON
 *    + d-forest is a library for searching nested objects to find nodes
 *        matching a given critera
 *    + io-ts is a schema and encoder/decoder library
 **/

/**
 * Schema definitions
 */
type JSAttrVal = number | boolean | string;
export const JSAttrVal = io.union([io.number, io.boolean, io.string]);

type JSAttributes = Record<string, JSAttrVal>;
export const JSAttributes = io.record(io.string, JSAttrVal)

export interface JSElement {
  type: 'element';
  name: string;
  attributes?: JSAttributes;
  elements?: Array<JSElement | JSTextNode>;
}

export interface JSTextNode {
  type: 'text';
  text: string;
}

export const JSTextNode = io.type({
  type: io.literal('text'),
  text: io.string,
}, 'JSTextNode');

type JSChild = JSElement | JSTextNode;

export const JSChild: io.Type<JSChild> = io.recursion(
  'JSChild',
  () => io.union([JSElement, JSTextNode])
);

export const JSElement: io.Type<JSElement> = io.recursion(
  'JSElement', () => io.intersection([
    io.type({
      type: io.literal('element'),
      name: io.string,
    }),
    io.partial({
      attributes: JSAttributes,
      elements: io.array(JSChild)
    })
  ], 'JSElement')
);

export interface JSRoot {
  elements: Array<JSElement>;
}

export const JSRoot = io.type({
  elements: io.array(JSElement)
}, 'JSRoot');

export type JSNode = JSRoot | JSElement | JSTextNode;

/**
 * Create JSDocuments
 **/
export function xmlStringToJSDocument(xmlString: string): E.Either<string[], JSRoot> {
  const asJson = convert.xml2js(xmlString, {
    compact: false,
  });
  return parseJSDocument(asJson);
}

export function parseJSDocument(root: unknown): E.Either<string[], JSRoot> {
  return pipe(
    JSRoot.decode(root),
    E.mapLeft(errors => {
      const report = PathReporter.report(E.left(errors));
      prettyPrint({ report });
      return report;
    })
  );
}


export function findElement(
  root: object,
  pred: (e: JSElement) => boolean,
  predAttrs?: (attrs: JSAttributes) => boolean
): JSElement | undefined {
  if (!JSElement.is(root)) {
    return;
  }
  return df.findNode(root, (el) => {
    if (!JSElement.is(el)) {
      return false;
    }
    const elMatch = pred(el);
    const attrMatch = predAttrs && el.attributes ? predAttrs(el.attributes) : true;
    return elMatch && attrMatch;
  });

}

export function findElements(
  root: JSNode,
  pred: (e: JSElement) => boolean,
  predAttrs?: (attrs: JSAttributes) => boolean
): JSElement[] {
  if (!JSElement.is(root)) {
    return [];
  }
  return df.findNodes(root, (el) => {
    if (!JSElement.is(el)) {
      return false;
    }
    const elMatch = pred(el);
    const attrMatch = predAttrs && el.attributes ? predAttrs(el.attributes) : true;
    return elMatch && attrMatch;
  });
}

export function getElementText(elem: JSElement): string | undefined {
  const childs = elem.elements;
  if (childs === undefined) {
    return;
  }
  if (childs.length !== 1) {
    return;
  }
  const c0 = childs[0];
  if (!JSTextNode.is(c0)) {
    return;
  }
  return c0.text;
}

export function findElementText(
  root: object,
  pred: (e: JSElement) => boolean,
  predAttrs?: (attrs: JSAttributes) => boolean
): string | undefined {
  const elem = findElement(root, pred, predAttrs)
  if (elem === undefined) return;
  return getElementText(elem);
}
