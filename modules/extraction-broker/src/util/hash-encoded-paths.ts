import path from 'path';
import fs, { Dirent } from 'fs';

import { shaEncodeAsHex } from './string-utils';

export interface HashEncodedPath {
  source: string;
  hashedSource: string;
  depth: number;
  leadingSegments: string[];
  toPath(): string;
}

export function makeHashEncodedPath(source: string, depth: number): HashEncodedPath {
  const hashedSource = shaEncodeAsHex(source);
  const leadingSegments = hashedSource
    .slice(0, depth)
    .split('');

  return {
    source,
    hashedSource,
    depth,
    leadingSegments,
    toPath() {
      const leaf = `${hashedSource}.d`;
      return path.join(leadingSegments.join('/'), leaf);
    },
  };
}

export function* walkDir(path: string): IterableIterator<string> {

  const entries: Dirent[] = fs.readdirSync(path, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath: () => string = () => `${path}/${entry.name}`;

    if (entry.isFile()) {
      yield entryPath();
    }

    if (entry.isDirectory()) {
      yield* walkDir(entryPath());
    }
  }
}

