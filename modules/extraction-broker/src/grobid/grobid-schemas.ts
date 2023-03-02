import _ from 'lodash';
import * as io from 'io-ts';
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function';
import { PathReporter } from 'io-ts/lib/PathReporter';

export const Attributes = io.partial({
  unit: io.string,
  type: io.string,
  level: io.string,
  when: io.string,
  page: io.string,
  from: io.string,
  to: io.string,
  'xml:id': io.string
}, 'Attributes');

export type Attributes = io.TypeOf<typeof Attributes>;

export const Elem = io.partial({
  _attributes: Attributes,
  _text: io.string
}, 'Elem');

export type Elem = io.TypeOf<typeof Elem>;

export const PersName = io.type({
  persName: io.partial({
    forename: io.union([io.array(Elem), Elem]),
    surname: io.union([io.array(Elem), Elem]),
  })
}, 'PersName');

export type PersName = io.TypeOf<typeof PersName>;

export const Analytic = io.partial({
  title: io.union([io.array(Elem), Elem]),
  author: io.union([
    PersName,
    io.array(PersName),
  ])
}, 'Analytic');

export type Analytic = io.TypeOf<typeof Analytic>;

const DateAttr = io.strict({
  type: io.string,
  when: io.string
});

export type DateAttr = io.TypeOf<typeof DateAttr>;

const DateElem = io.strict({
  _attributes: DateAttr,
  _text: io.string
});

export type DateElem = io.TypeOf<typeof DateElem>;

export const Imprint = io.partial({
  biblScope: io.union([io.array(Elem), Elem]),
  date: DateElem
}, 'Imprint');

export type Imprint = io.TypeOf<typeof Imprint>;

export const Monogr = io.partial({
  title: io.union([io.array(Elem), Elem]),
  // editor: io.union([io.array(Elem), Elem]),
  imprint: Imprint,
}, 'Monogr');

export type Monogr = io.TypeOf<typeof Monogr>;

export const Reference = io.partial({
  _attributes: Attributes,
  analytic: Analytic,
  note: Elem,
  idno: Elem,
  monogr: Monogr
}, 'Reference');

export type Reference = io.TypeOf<typeof Reference>;


export const References = io.array(Reference);
export type References = io.TypeOf<typeof References>;


export function decodeGrobidReference(input: any): E.Either<string[], Reference> {
  return pipe(
    E.right(input),
    E.chain(x => Reference.decode(x)),
    E.mapLeft(err => {
      const report = PathReporter.report(E.left(err));
      return report;
    })
  );
}

export function decodeGrobidReferences(input: any): E.Either<string[], References> {
  return pipe(
    E.right(input),
    E.chain(x => References.decode(x)),
    E.mapLeft(err => {
      const report = PathReporter.report(E.left(err));
      return report;
    })
  );
}
