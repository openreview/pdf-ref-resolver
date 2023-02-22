import _ from 'lodash';

export interface Radix<D> {
  data: D | undefined;
  children: Map<string, Radix<D>>;
}

type RadixPath = string[];

export const createRadix = <D>(): Radix<D> => ({
  data: undefined,
  children: new Map(),
});

function cleanPath(p: string | string[]): string[] {
  if (typeof p === 'string') {
    return p.split('.');
  }
  return p;
}

function radSet<T>(
  radix: Radix<T>,
  path: string | string[],
  data: T,
): T | undefined {
  let radCurr = radix;
  _.each(path, p => {
    const nextChild = radCurr.children.get(p);
    if (nextChild === undefined) {
      const child = createRadix<T>();
      radCurr.children.set(p, child);
      radCurr = child;
      return;
    }
    radCurr = nextChild;
  });

  const oldData = radCurr.data;
  radCurr.data = data;
  return oldData;
}

function radGet<T>(
  radix: Radix<T>,
  path: string | string[],
): T | undefined {
  const pathCurr = _.concat(path);
  let radCurr: Radix<T> | undefined = radix;
  while (pathCurr.length > 0 && radCurr !== undefined) {
    const p = pathCurr.shift()!;
    radCurr = radCurr.children.get(p);
  }

  return radCurr ? radCurr.data : undefined;
}

export const radUpsert = <T>(
  radix: Radix<T>,
  path: string | string[],
  f: (t?: T) => T,
): void => {
  const valpath = cleanPath(path);
  const prior = radGet(radix, valpath);
  const upVal = f(prior);
  radSet(radix, valpath, upVal);
};

export const radInsert = <T>(radix: Radix<T>, path: string | string[], t: T): void => radUpsert(radix, path, () => t);

export const radTraverseDepthFirst = <T>(
  radix: Radix<T>,
  f: (path: RadixPath, t?: T, childCount?: number, node?: Radix<T>) => void,
): void => {
  function _loop(rad: Radix<T>, lpath: string[]) {
    const childCount = rad.children.size;
    f(lpath, rad.data, childCount, rad);

    rad.children.forEach((childRad, childKey) => {
      const newpath = _.concat(lpath, childKey);
      _loop(childRad, newpath);
    });
  }
  _loop(radix, []);
};

export const radTraverseValues = <T>(
  radix: Radix<T>,
  f: (path: RadixPath, t: T) => void,
): void => radTraverseDepthFirst(radix, (path, maybeT) => {
  if (maybeT === undefined) return;

  f(path, maybeT);
});

export const radUnfold = <T, U>(
  radix: Radix<T>,
  f: (path: RadixPath, t?: T) => U | undefined,
): Array<U> => {
  const res: U[] = [];
  radTraverseDepthFirst(radix, (path, maybeT, _childCount) => {
    const u = f(path, maybeT);
    if (u !== undefined) {
      res.push(u);
    }
  });

  return res;
};

export interface FoldArgs<T, U> {
  index: number;
  nodeData?: T;
  childResults: U[];
  node?: Radix<T>;
}

export const radFoldUp = <T, U>(
  radix: Radix<T>,
  f: (path: RadixPath, args: FoldArgs<T, U>) => U,
): U => {
  const rstack: [string[], T | undefined, number | undefined, Radix<T> | undefined][] = [];

  radTraverseDepthFirst(radix, (path, maybeT, childCount, node) => {
    rstack.push([path, maybeT, childCount, node]);
  });

  const ustack: U[] = [];
  let index = 0;
  while (rstack.length > 0) {
    // prettyPrint({ currRStack: rstack.map(el => ({path: el[0], tval: el[1] })), ustack })
    const [ipath, nodeData, ichildCount, node] = rstack.pop()!;
    const childResults = ustack.splice(0, ichildCount);
    const ures = f(ipath, {
      nodeData, index, childResults, node,
    });
    // prettyPrint({ childResultsArgs: childResults, result: ures })
    ustack.unshift(ures);
    index += 1;
  }

  return ustack[0];
};
