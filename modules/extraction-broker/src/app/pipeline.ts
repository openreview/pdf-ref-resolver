import * as E from 'fp-ts/Either';

import {
  gbdXmlToReferences,
  summarizeReferences,
  runOpenReviewQueries,
  outputBiblioSummary
} from '~/grobid/grobid-etl';

import {
  prettyPrint,
  putStrLn
} from '~/util/pretty-print';

import {
  grobidProcessReferences
} from '~/grobid/grobid-queries';

type Args = {
  pdf: string,
}

export async function runExtractReferences({
  pdf
}: Args) {
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

  outputBiblioSummary(biblioStats, refs)

  // prettyPrint({ biblioStats });
}
