import * as E from 'fp-ts/lib/Either';
import fs from 'fs';
import path from 'path';

import {
  gbdXmlToReferences,
  summarizeReferences,
  runOpenReviewQueries,
  createJsonFormatOutput
} from '~/grobid/grobid-etl';

import {
  putStrLn
} from '~/util/pretty-print';

import {
  grobidIsAlive,
  grobidProcessReferences
} from '~/grobid/grobid-queries';

import { ConfigType } from '~/util/config';
import { OpenReviewQueries } from '~/openreview/openreview-queries';

export type ContentFlags = {
  withMatched: boolean;
  withUnmatched: boolean;
  withPartialMatched: boolean;
  withSource: boolean;
};

type Args = ContentFlags & {
  pdf: string;
  toFile: boolean;
  outputPath?: string;
  overwrite: boolean;
  config: ConfigType;
}

export function outputExists(file: string, overwrite: boolean): boolean {
  if (fs.existsSync(file) && overwrite) {
    fs.rmSync(file);
  }
  return fs.existsSync(file);
}

function determineOutputFilename({
  pdf,
  toFile,
  outputPath
}: Args): string | undefined {
  let outputFilename: string | undefined;
  const format = 'json';
  if (toFile) {
    if (outputPath === undefined) {
      // Default to same as input
      outputFilename = `${pdf}.refs.${format}`;
    } else {
      const pdfBase = path.basename(pdf);
      const outputBase = `${pdfBase}.refs.${format}`;
      outputFilename = path.join(outputPath, outputBase)
    }
  }
  return outputFilename;
}

export async function runExtractReferences(args: Args) {
  const {
    pdf,
    overwrite,
    config
  } = args;

  const outputFilename = determineOutputFilename(args);

  if (outputFilename && outputExists(outputFilename, overwrite)) {
    putStrLn(`Output file already exists: ${outputFilename}`);
    putStrLn('Skipping. Use --overwrite to force');
    return;
  }

  const isAlive = await grobidIsAlive();
  if (!isAlive) {
    putStrLn('Error: Grobid is not running; exiting...');
    return;
  }

  const openreviewQueries = new OpenReviewQueries(config);
  const orLogin = await openreviewQueries.login();

  if (!orLogin) {
    putStrLn('Error: Could not login to OpenReview; exiting...');
    return;
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

  await runOpenReviewQueries(refs, openreviewQueries);

  const biblioStats = await summarizeReferences(refs);
  const jsonOutput = createJsonFormatOutput(biblioStats, refs, args);
  const outputContent = JSON.stringify(jsonOutput);

  if (outputFilename) {
    fs.writeFileSync(outputFilename, outputContent, {});
    putStrLn(`Wrote ${outputFilename}`);
  } else {
    putStrLn(outputContent);
  }
}
