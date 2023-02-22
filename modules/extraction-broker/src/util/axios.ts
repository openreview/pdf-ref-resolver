import _ from 'lodash';

import axios, {
  AxiosRequestConfig,
  AxiosInstance,
} from 'axios';

export function configRequest(): AxiosRequestConfig {
  const auth = {};

  const config: AxiosRequestConfig = {
    baseURL: 'http://localhost:3100/',
    headers: {
      ...auth,
    },
    timeout: 4000,
    // responseType: "json"
  };

  return config;
}

export function configAxios(): AxiosInstance {
  const conf = configRequest();
  return axios.create(conf);
}

export function resolveCorpusUrl(entryId: string, ...artifactPaths: string[]): string {
  const fullPath = resolveCorpusPath(entryId, ...artifactPaths);
  const base = 'http://localhost:3100';
  return base + fullPath;
}

export function resolveCorpusPath(entryId: string, ...artifactPaths: string[]): string {
  const leaves = _.join([entryId, ...artifactPaths], '/');
  console.log('leaves', leaves)
  return _.join(['/api/corpus/entry', leaves], '/');
}

export async function getArtifactData<T>(entryId: string, ...artifactPaths: string[]): Promise<T | undefined> {
  return configAxios()
    .get(resolveCorpusPath(entryId, ...artifactPaths))
    .then(resp => resp.data);
}

export async function getEntryList<T>(): Promise<T | undefined> {
  const endpoint = '/api/corpus/entries';

  return configAxios()
    .get(endpoint)
    .then(resp => resp.data);
}
