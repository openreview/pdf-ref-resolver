import _ from 'lodash';

/*
 * Note: This function was written by ChatGPT4 given the following prompt:
 *
 *     Create a typescript function that computes the levenshtein distance
 *     between two string. The function should use dynamic programming, and
 *     perform with optimal speed and space requirements.
 *
 * Parameters to change costs was added manually.
 */

export function levenshteinDistance(s1: string, s2: string, pcosts: Partial<Costs> = {}): number {
  const adjustedCosts = _.assign({}, DefaultCosts, pcosts);

  // Create a 2D array with dimensions (s1.length + 1) x (s2.length + 1)
  const matrix: number[][] = new Array(s1.length + 1)
    .fill(null)
    .map(() => new Array(s2.length + 1).fill(0));

  // Initialize the first row and column
  for (let i = 0; i <= s1.length; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  const { ins, del, sub } = adjustedCosts;

  // Compute the Levenshtein distance using dynamic programming
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const substitutionCost = s1[i - 1] === s2[j - 1] ? 0 : sub;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + del, // deletion
        matrix[i][j - 1] + ins, // insertion
        matrix[i - 1][j - 1] + substitutionCost // substitution
      );
    }
  }

  // The Levenshtein distance is the value at the bottom-right corner of the matrix
  return matrix[s1.length][s2.length];
}

export interface Costs {
  ins: number;
  del: number;
  sub: number;
}

export const DefaultCosts: Costs = {
  ins: 1,
  del: 1,
  sub: 1
};
