import * as E from 'fp-ts/Either';

import {
  registerCmd,
  config,
  opt,
  YArgsT
} from '~/util/arglib';
import fs from 'fs';
import { gbdXmlToReferences, printReferences, runOpenReviewQueries } from './grobid-etl';
import { prettyPrint, putStrLn } from '~/util/pretty-print';
import {  grobidProcessReferences } from './grobid-queries';

export function registerCommands(args: YArgsT) {

  registerCmd(
    args,
    'extract-references',
    'Extract PDF references using Grobid service, match with OpenReview papers',
    config(
      opt.env,
      opt.file('pdf'),
      // opt.str('out'),
    ),
  )(async (args: any) => {
    const { pdf } = args;

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

    await printReferences(refs);

    // TODO opt: write xml
    // TODO opt: commit to db
    // TODO opt: print results
    //
    // fs.writeFileSync(out, result.right);
    // .catch((error: Error) => {
    //   putStrLn(`Error: ${error.message}`);
    // })
  });

  registerCmd(
    args,
    'xml-to-json',
    'Convert Grobid XML data to JSON',
    config(
      opt.env,
      opt.cwd,
      opt.flag('query-openreview', false),
      opt.flag('verbose', false),
      opt.file('xml'),
    ),
  )(async (args: any) => {
    const { xml, queryOpenreview, verbose } = args;

    const xmlInput = fs.readFileSync(xml);
    const grobidJson_ = gbdXmlToReferences(xmlInput.toString());
    if (E.isLeft(grobidJson_)) {
      prettyPrint({ error: grobidJson_.left });
      return;
    }

    const grobidRefs = grobidJson_.right;
    grobidRefs.forEach(ref => {
      prettyPrint({ ref }, { depth: 15 });
    })


    if (queryOpenreview) {
      await runOpenReviewQueries(grobidRefs)
    }
  });
}
