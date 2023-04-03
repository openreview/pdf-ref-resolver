import * as E from 'fp-ts/Either';
import fs from 'fs';

import {
  gbdXmlToReferences,
  summarizeReferences,
  runOpenReviewQueries,
  outputBiblioSummary
} from '~/grobid/grobid-etl';

import {
  putStrLn
} from '~/util/pretty-print';

import {
  grobidProcessReferences
} from '~/grobid/grobid-queries';

export type OutputFormat = 'txt' | 'json';

type Args = {
  pdf: string;
  toFile: boolean;
  toConsole: boolean;
  format: OutputFormat;
  overwrite: boolean;
}

export function outputExists(file: string, overwrite: boolean): boolean {
  if (fs.existsSync(file) && overwrite) {
    fs.rmSync(file);
  }
  return fs.existsSync(file);
}

function isGrobidRunning(): boolean {
  return false;
}

export async function runExtractReferences({
  pdf,
  toFile,
  toConsole,
  format,
  overwrite
}: Args) {
  // check grobid is running
  // check OpenReview API is available

  const outputFilename = `${pdf}.refs.${format}`
  if (outputExists(outputFilename, overwrite)) {
    putStrLn(`Output file already exists: ${outputFilename}`);
    putStrLn('Skipping. Use --overwrite to force');
    return;
  }

  if (fs.existsSync(outputFilename)) {
    if (overwrite) {
      fs.rmSync(outputFilename);
    } else {
      putStrLn(`Output file already exists: ${outputFilename}`);
      putStrLn('Skipping. Use --overwrite to force');
      return;
    }
  }

  const xmlString = await grobidProcessReferences(pdf)
  if (E.isLeft(xmlString)) {
    putStrLn('Error processing references');
    putStrLn(xmlString.left.join('\n'));
    return;
  }

  const refsOrError = gbdXmlToReferences(xmlString.right);
  if (E.isLeft(refsOrError)) {
    putStrLn('Error transforming grobid XML');
    putStrLn(refsOrError.left.join('\n'));

    return;
  }

  const refs = refsOrError.right;

  await runOpenReviewQueries(refs);

  const biblioStats = await summarizeReferences(refs);

  outputBiblioSummary(biblioStats, refs, { toConsole, outputFile: toFile? outputFilename : undefined })
}