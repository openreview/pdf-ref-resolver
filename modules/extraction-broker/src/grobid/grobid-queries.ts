import _ from 'lodash';
import * as E from 'fp-ts/lib/Either'

import axios, {
  AxiosRequestConfig,
  AxiosInstance,
} from 'axios';

import FormData from 'form-data';
import fs from 'fs';

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

export async function grobidProcessReferences(pdfFile: string): Promise<E.Either<string[], string>> {
  const data = new FormData()
  data.append('input', fs.createReadStream(pdfFile))

  return await grobidReq()
    .post('/api/processReferences', data, {
      headers: data.getHeaders()
    })
    .then((resp) => E.right(resp.data))
    .catch((error: Error) => E.left([error.name,  error.message]))
}

export async function grobidIsAlive(): Promise<boolean> {
  // return await grobidReq()
  //   .get('/api/health', {
  //     headers: data.getHeaders()
  //   })
  //   .then((resp) => E.right(true))
  //   .catch((error: Error) => E.left([error.name,  error.message]))
  return false;

}
