import {
  registerCmd,
  config,
  opt,
  YArgsT
} from '~/cli/arglib';

import _ from 'lodash';

import axios, {
  AxiosRequestConfig,
  AxiosInstance,
} from 'axios';
import { prettyPrint, putStrLn } from '~/util/pretty-print';

export function registerCommands(args: YArgsT) {
  registerCmd(
    args,
    'extract-pdf',
    'Extract PDF using Grobid service',
    config(
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
}


import FormData from 'form-data';
import fs from 'fs';
// import { XMLParser } from 'fast-xml-parser'

import convert from 'xml-js'

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

async function grobidProcessReferences(pdfFile: string): Promise<JSON> {
  const data = new FormData()
  data.append('input', fs.createReadStream(pdfFile))

  return await grobidReq()
    .post('/api/processReferences', data, {
      headers: data.getHeaders()
    })
    .then((resp) => {
      // const parser = new XMLParser();
      const jsonText = convert.xml2json(resp.data, {compact: true});
      const jsonData = JSON.parse(jsonText)
      const back = jsonData.TEI.text.back;
      const bibliography = back.div.listBibl.biblStruct
      prettyPrint({ bibliography });

      return bibliography;
    });
}

async function extractPdf(pdfFile: string) {
  putStrLn(`Extracting ${pdfFile}`);
  await grobidProcessReferences(pdfFile);

}
