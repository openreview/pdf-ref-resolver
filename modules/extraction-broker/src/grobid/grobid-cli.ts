
import * as E from 'fp-ts/Either';
import {
  registerCmd,
  config,
  opt,
  YArgsT
} from '~/util/arglib';
import fs from 'fs';
import { gbdXmlToReferences, runOpenReviewQueries } from './grobid-data';
import { prettyPrint, putStrLn } from '~/util/pretty-print';
import { extractRefs, extractPdf, grobidProcessReferencesToXML } from './grobid-io';

export function registerCommands(args: YArgsT) {
  registerCmd(
    args,
    'extract-pdf',
    'Extract PDF using Grobid service',
    config(
      opt.env,
      opt.cwd,
      opt.file('pdf'),
    ),
  )(async (args: any) => {
    const { pdf } = args;

    await extractPdf(pdf)
      .then(() => {
        console.log('success');
      });
  });

  registerCmd(
    args,
    'show-pdf-refs',
    'Extract PDF references using Grobid service, printing the result',
    config(
      opt.cwd,
      opt.file('pdf'),
      opt.str('out'),
    ),
  )(async (args: any) => {
    const { pdf, out } = args;

    await extractRefs(pdf)
      .then((jsonData: string) => {
        fs.writeFileSync(out, jsonData);
      })
      .catch((error: Error) => {
        console.log(`Error: ${error.message}`);
      })
    ;
  });

  registerCmd(
    args,
    'grobid-get-refs-xml',
    'Extract PDF references using Grobid service, return Grobid-XML',
    config(
      opt.cwd,
      opt.file('pdf'),
      opt.str('out'),
    ),
  )(async (args: any) => {
    const { pdf, out } = args;

    await grobidProcessReferencesToXML(pdf)
      .then((result) => {
        if (E.isLeft(result)) {
          putStrLn('Error processing references');
          putStrLn(result.left.join('\n'));
          return;
        }
        fs.writeFileSync(out, result.right);
        putStrLn('Success');
      })
      .catch((error: Error) => {
        putStrLn(`Error: ${error.message}`);
      })
    ;
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
