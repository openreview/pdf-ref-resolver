import { levenshteinDistance, Costs } from './leven';
import _ from 'lodash';

describe('Levenshtein string distance', () => {
  it('should work with default costs', () => {
    const examples: Array<[string, string, number]> = [
      ['foo', 'foo', 0],
      ['a', 'b', 1],
      ['ab', 'ac', 1],
      ['ac', 'bc', 1],
      ['abc', 'axc', 1],
      ['kitten', 'sitting', 3],
      ['xabxcdxxefxgx', '1ab2cd34ef5g6', 6],
      ['cat', 'cow', 2],
      ['xabxcdxxefxgx', 'abcdefg', 6],
      ['javawasneat', 'scalaisgreat', 7],
      ['example', 'samples', 3],
      ['sturgeon', 'urgently', 6],
      ['levenshtein', 'frankenstein', 6],
      ['distance', 'difference', 5],
      ['因為我是中國人所以我會說中文', '因為我是英國人所以我會說英文', 2],
    ];
    examples.forEach(example => {
      const [s1, s2, expectedDist] = example;
      const actualDist = levenshteinDistance(s1, s2)
      expect(actualDist).toEqual(expectedDist);
    })
  });

  it('should work with non-default costs', () => {
    const examples: Array<[string, string, number, Partial<Costs>]> = [
      ['foo', 'foo-blah', 0, { ins: 0 }],
      ['foo-blah', 'foo', 0, { del: 0 }],
      ['D J Fleet', 'David J. Fleet', 0, {ins: 0}],
      ['DJFleet', '~David_J._Fleet1', 1, {ins: 0}],
    ];

    const standardCosts: Costs = { ins: 1, del: 1, sub: 1 };

    examples.forEach(example => {
      const [s1, s2, expectedDist, pcosts] = example;
      const adjustedCosts = _.assign({}, standardCosts, pcosts);
      const actualDist = levenshteinDistance(s1, s2, adjustedCosts)
      expect(actualDist).toEqual(expectedDist);
    })
  });
});
