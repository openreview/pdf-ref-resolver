import * as E from 'fp-ts/lib/Either';
import fs from 'fs';
import path from 'path';

import {
  gbdXmlToReferences,
  summarizeReferences,
  runOpenReviewQueries,
  outputBiblioSummary,
  createJsonFormatOutput
} from '~/grobid/grobid-etl';

import {
  putStrLn
} from '~/util/pretty-print';

import {
  grobidIsAlive,
  grobidProcessReferences
} from '~/grobid/grobid-queries';

export type OutputFormat = 'txt' | 'json';

type Args = {
  pdf: string;
  toFile: boolean;
  outputPath?: string;
  format: OutputFormat;
  overwrite: boolean;
}

export function outputExists(file: string, overwrite: boolean): boolean {
  if (fs.existsSync(file) && overwrite) {
    fs.rmSync(file);
  }
  return fs.existsSync(file);
}

export async function runExtractReferences({
  pdf,
  toFile,
  format,
  outputPath,
  overwrite
}: Args) {
  // check grobid is running
  const isAlive = await grobidIsAlive();
  if (!isAlive) {
    putStrLn('Error: Grobid is not running; exiting...');
    return;
  }

  // TODO check OpenReview API is available


  let outputFilename: string | undefined;
  if (toFile) {
    if (outputPath === undefined) {
      // Default to same as input
      outputFilename = `${pdf}.refs.${format}`;
    } else {
      const pdfBase = path.basename(pdf);
      // const pdfDir = path.dirname(pdf);
      const outputBase = `${pdfBase}.refs.${format}`;
      outputFilename = path.join(outputPath, outputBase)
    }
  }

  // const outputFilename = toFile ? `${pdf}.refs.${format}` : undefined;
  if (outputFilename && outputExists(outputFilename, overwrite)) {
    putStrLn(`Output file already exists: ${outputFilename}`);
    putStrLn('Skipping. Use --overwrite to force');
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

  await runOpenReviewQueries(refs);

  const biblioStats = await summarizeReferences(refs);
  let outputContent = '';
  if (format === 'json') {
    const jsonOutput = await createJsonFormatOutput(biblioStats, refs);
    outputContent = JSON.stringify(jsonOutput);
  } else {
    outputContent = outputBiblioSummary(biblioStats, refs);
  }

  if (outputFilename) {
    fs.writeFileSync(outputFilename, outputContent, {});
    putStrLn(`Wrote ${outputFilename}`);
  } else {
    putStrLn(outputContent);
  }
}
