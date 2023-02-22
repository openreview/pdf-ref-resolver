import _ from 'lodash';
import { prettyPrint } from './pretty-print';

import {
  createRadix,
  radUpsert,
  radInsert,
  radTraverseDepthFirst,
  radUnfold,
  radFoldUp,
  Radix,
} from './radix-tree';

function expectKeyVals<T>(rad: Radix<T>, expected: [string, T | undefined][]) {
  const unfolded = radUnfold(rad, (path, maybeVal) => [
    path.join('.'),
    maybeVal,
  ]);
  // prettyPrint({ unfolded })
  expect(unfolded).toStrictEqual(expected);
}

interface Foo {
  s: string;
  i: number;
}

function foo(n: number): Foo {
  return {
    s: `hey#${n}`,
    i: n,
  };
}

function foos(f1: Foo, f2: Foo): Foo {
  return {
    s: `${f1.s} & ${f2.s}`,
    i: f1.i + f2.i,
  };
}

function insertAndTest<T>(
  examples: Array<[string, T]>,
  expected: Array<[string, T | undefined]>,
) {
  const radTree = createRadix<T>();
  _.each(examples, e => {
    const [path, tval] = e;
    radInsert(radTree, path, tval);
  });
  // prettyPrint({ radTree })

  expectKeyVals(radTree, expected);
}

function upsertAndTest(
  examples: Array<[string, Foo]>,
  expected: Array<[string, Foo | undefined]>,
) {
  const radTree = createRadix<Foo>();
  _.each(examples, e => {
    const [path, fooVal] = e;
    radUpsert(radTree, path, (priorFoo?) => {
      if (priorFoo) {
        return foos(priorFoo, fooVal);
      }
      return fooVal;
    });
    // prettyPrint({ msg: 'upserting..', path, radTree })
  });
  // prettyPrint({ msg: 'upsert:done', radTree })

  expectKeyVals(radTree, expected);
}

describe('Radix Tree Tests', () => {
  it('should create a tree', () => {
    const radTree = createRadix<Foo>();

    radInsert(radTree, 'a.$', foo(25));

    expectKeyVals(radTree, [
      ['', undefined],
      ['a', undefined],
      ['a.$', foo(25)],
    ]);

    radInsert(radTree, 'a.$.12._$.b', foo(26));

    expectKeyVals(radTree, [
      ['', undefined],
      ['a', undefined],
      ['a.$', foo(25)],
      ['a.$.12', undefined],
      ['a.$.12._$', undefined],
      ['a.$.12._$.b', foo(26)],
    ]);

    radUpsert(radTree, 'a.$.12._$.b', prev => (prev ? foo(20) : foo(21)));

    expectKeyVals(radTree, [
      ['', undefined],
      ['a', undefined],
      ['a.$', foo(25)],
      ['a.$.12', undefined],
      ['a.$.12._$', undefined],
      ['a.$.12._$.b', foo(20)],
    ]);

    radUpsert(radTree, 'a.$.12._$.q', prev => (prev ? foo(20) : foo(21)));

    expectKeyVals(radTree, [
      ['', undefined],
      ['a', undefined],
      ['a.$', foo(25)],
      ['a.$.12', undefined],
      ['a.$.12._$', undefined],
      ['a.$.12._$.b', foo(20)],
      ['a.$.12._$.q', foo(21)],
    ]);
  });

  it('should pass misc examples', () => {
    upsertAndTest([
      ['a', foo(1)],
      ['a.b.c', foo(2)],
    ], [
      ['', undefined],
      ['a', foo(1)],
      ['a.b', undefined],
      ['a.b.c', foo(2)],
    ]);

    upsertAndTest([
      ['a.b', foo(1)],
      ['a.b', foo(2)],
    ], [
      ['', undefined],
      ['a', undefined],
      ['a.b', foos(foo(1), foo(2))],
    ]);
  });

  it('should traverse all paths depth first', () => {
    const radTree = createRadix<Foo>();

    radInsert(radTree, 'a.b', { s: 'ab-val', i: 123 });
    radInsert(radTree, 'd.e.f', { s: 'def-val', i: 345 });

    radTraverseDepthFirst(radTree, (path, maybeVal) => {
      prettyPrint({ path, maybeVal });
    });
  });

  it('should unfold all paths', () => {
    const radTree = createRadix<Foo>();

    radInsert(radTree, 'a.b', { s: 'ab-val', i: 123 });
    radInsert(radTree, 'd.e.f', { s: 'def-val', i: 345 });

    const unfolded = radUnfold(radTree, (path, maybeVal) => [
      path.join(''),
      maybeVal !== undefined,
    ]);
    const expected = [
      ['', false],
      ['a', false],
      ['ab', true],
      ['d', false],
      ['de', false],
      ['def', true],
    ];

    expect(unfolded).toStrictEqual(expected);
  });

  it.only('should foldUp', () => {
    const radTree = createRadix<Foo>();

    radInsert(radTree, 'a', { s: 'd0', i: 123 });
    radInsert(radTree, 'a.b.c', { s: 'd1', i: 345 });
    radInsert(radTree, 'a.d.e', { s: 'd1', i: 345 });

    const foldedResult = radFoldUp(radTree, (path, { nodeData, childResults, index }) => {
      const d = nodeData ? '!' : '';
      const ch = childResults.length > 0 ? `(${childResults.join(', ')})` : '';
      const self = path.length > 0 ? path.join('.') : '';
      return `${self}#${index}${d}${ch}`;
    });

    const expected = '#5(a#4!(a.b#3(a.b.c#2!), a.d#1(a.d.e#0!)))';
    expect(foldedResult).toStrictEqual(expected);
  });
});
