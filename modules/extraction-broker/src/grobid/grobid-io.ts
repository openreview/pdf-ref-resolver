import {
  registerCmd,
  config,
  opt,
  YArgsT
} from '~/util/arglib';

import _ from 'lodash';
import * as E from 'fp-ts/Either'

import axios, {
  AxiosRequestConfig,
  AxiosInstance,
} from 'axios';

import { prettyPrint, putStrLn } from '~/util/pretty-print';
import FormData from 'form-data';
import fs from 'fs';

import convert from 'xml-js'
import { decodeGrobidReference, decodeGrobidReferences, Reference } from './grobid-schemas';
import { insertPdfReferences } from '~/db/mongo-schemas';

export function grobidReq(): AxiosInstance {
  const config: AxiosRequestConfig = {
    baseURL: 'http://localhost:8070/',
    timeout: 200000,
    headers: {
    },
    responseType: 'document'
  };

  return axios.create(config);
}

async function grobidProcessReferencesToXML(pdfFile: string): Promise<E.Either<string[], string>> {
  const data = new FormData()
  data.append('input', fs.createReadStream(pdfFile))

  return await grobidReq()
    .post('/api/processReferences', data, {
      headers: data.getHeaders()
    })
    .then((resp) => E.right(resp.data))
    .catch((error: Error) => E.left([error.name,  error.message]))
}

async function grobidProcessReferences(pdfFile: string): Promise<E.Either<string[], Reference[]>> {
  const data = new FormData()
  data.append('input', fs.createReadStream(pdfFile))

  return grobidProcessReferencesToXML(pdfFile)
    .then((response) => {
      if (E.isLeft(response)) {
        return response;
      }
      const xml = response.right;

      const jsonText = convert.xml2json(xml, { compact: true });
      const jsonData = JSON.parse(jsonText)
      const back = jsonData.TEI.text.back;
      const bibliography: any[] = back.div.listBibl.biblStruct

      bibliography.forEach(reference => {
        const decoded = decodeGrobidReference(reference);
        if (E.isLeft(decoded)) {
          const error = decoded.left.join('\n');
          prettyPrint({ msg: 'Error', reference, error });
        }
      });

      const refs = decodeGrobidReferences(bibliography);

      return refs;
    });
}

async function extractPdf(pdfFile: string) {
  putStrLn(`Extracting ${pdfFile}`);
  const maybeRefs = await grobidProcessReferences(pdfFile);
  if (E.isLeft(maybeRefs)) {
    putStrLn('Error extracting references');
    const msg = maybeRefs.left.join('\n');
    putStrLn(msg);
    return;
  }

  const refs = maybeRefs.right;
  prettyPrint({ refs })
  await insertPdfReferences(pdfFile, refs);
}

async function extractRefs(pdfFile: string): Promise<string> {
  const maybeRefs = await grobidProcessReferences(pdfFile);
  if (E.isLeft(maybeRefs)) {
    const errors = maybeRefs.left;
    const output = {
      errors
    };
    return JSON.stringify(output, null, 4)
  }

  const refs = maybeRefs.right;
  const output = {
    references: refs
  };
  return JSON.stringify(output, null, 4);
}

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
}
