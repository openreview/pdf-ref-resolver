/* tslint:disable: no-console */

import _ from 'lodash';
import { sortedUniqCountBy } from './lodash-plus';

type TupleAN = readonly [any, number];

interface CountUniqExample {
  example: any[];
  expect: TupleAN[];
  f?: (v: any) => any;
}

describe('Sorted Uniq Counting', () => {
  it('should count/uniq by identity', () => {
    const examples: CountUniqExample[] = [
      { example: [0, 1, 2], expect: [[0, 1], [1, 1], [2, 1]] },
      { example: 'aabbc'.split(''), expect: [['a', 2], ['b', 2], ['c', 1]] },
    ];

    _.each(examples, (e) => {
      const res = sortedUniqCountBy(e.example);
      expect(res).toEqual(e.expect);
      console.log(res);
    });
  });

  it('should count/uniq by custom function', () => {
    const examples: CountUniqExample[] = [
      { example: [1.1, 1.2, 2.3, 2.4], expect: [[1.1, 2], [2.3, 2]], f: Math.floor },
    ];

    _.each(examples, (e) => {
      const res = sortedUniqCountBy(e.example, e.f);
      expect(res).toEqual(e.expect);
      console.log(res);
    });
  });
});
