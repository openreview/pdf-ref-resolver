import _ from 'lodash';

export type SlidingWindowFunc = <A>(xs: ReadonlyArray<A>) => ReadonlyArray<ReadonlyArray<A>>;

export function slidingWindow(
  window: number,
  offset: number = 1,
): SlidingWindowFunc {
  return xs => (
    xs.length < window ? []
      : _.concat([xs.slice(0, window)], slidingWindow(window, offset)(xs.slice(offset)))
  );
}

// _.concat(     [xs.slice(0, window), ...slidingWindow(window, offset)(xs.slice(offset))]
