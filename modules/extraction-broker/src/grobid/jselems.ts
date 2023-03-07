import df from 'd-forest';
import _ from 'lodash';
import * as io from 'io-ts';
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function';
import { PathReporter } from 'io-ts/lib/PathReporter';

type JSAttrVal = number | boolean | string;
export const JSAttrVal = io.union([io.number, io.boolean, io.string]);

type JSAttributes = Record<string, JSAttrVal>;
export const JSAttributes = io.record(io.string, JSAttrVal)

export interface JSElement {
  type: 'element';
  name: string;
  attributes: JSAttributes;
  elements: Array<JSElement | JSTextNode>;
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
  'JSElement', () => io.type({
    type: io.literal('element'),
    name: io.string,
    attributes: JSAttributes,
    elements: io.array(JSChild)
  }));



export interface JSRoot {
  elements: Array<JSElement>;
}

export const JSRoot = io.type({
  elements: io.array(JSElement)
}, 'JSRoot');

export function parseJSDocument(root: unknown): E.Either<string[], JSRoot> {
  return pipe(
    JSRoot.decode(root),
    E.mapLeft(errors => {
      errors.map(err => {
        console.log({ err });
      });
      const report = PathReporter.report(E.left(errors));
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
    const attrMatch = predAttrs ? predAttrs(el.attributes) : true;
    return elMatch && attrMatch;
  });

}

export function findElements(
  root: object,
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
    const attrMatch = predAttrs ? predAttrs(el.attributes) : true;
    return elMatch && attrMatch;
  });
}

export function getElementText(elem: JSElement): string | undefined {
  if (elem.elements.length !== 1) {
    return;
  }
  const e0 = elem.elements[0];
  if (!JSTextNode.is(e0)) {
    return;
  }
  return e0.text;
}
