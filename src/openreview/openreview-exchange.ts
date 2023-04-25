/**
 * Low-level interface to communicate with OpenReview REST Api
 */

import _ from 'lodash';
import axios from 'axios';

import {
  AxiosRequestConfig,
  AxiosInstance,
  AxiosError
} from 'axios';


import { ConfigType } from '~/util/config';
import { putStrLn } from '~/util/pretty-print';

type ErrorTypes = AxiosError | unknown;

export interface User {
  id: string;
}

export interface Credentials {
  token: string;
  user: User;
}

export class OpenReviewExchange {
  credentials?: Credentials;
  user: string;
  password: string;
  apiBaseURL: string;

  constructor(config: ConfigType) {
    this.apiBaseURL = config.get('openreview:restApi');
    this.user = config.get('openreview:restUser');
    this.password = config.get('openreview:restPassword');
  }


  configRequest(): AxiosRequestConfig {
    let auth = {};
    if (this.credentials) {
      auth = {
        Authorization: `Bearer ${this.credentials.token}`
      };
    }

    const reqconfig: AxiosRequestConfig = {
      baseURL: this.apiBaseURL,
      headers: {
        'User-Agent': 'open-extraction-service',
        ...auth
      },
      timeout: 10000,
      responseType: 'json'
    };

    return reqconfig;
  }

  configAxios(): AxiosInstance {
    const conf = this.configRequest();
    return axios.create(conf);
  }

  async getCredentials(): Promise<Credentials | undefined> {
    if (this.credentials !== undefined) {
      return this.credentials;
    }

    putStrLn(`Logging in as ${this.user}`);
    if (this.user === undefined || this.password === undefined) {
      return Promise.reject(new Error('Openreview API: user or password not defined'));
    }
    this.credentials = await this.postLogin();
    if (this.credentials) {
      putStrLn(`Successfully logged in to OpenReview as ${this.credentials.user.id}`);
    }

    return this.credentials;
  }

  async postLogin(): Promise<Credentials | undefined> {
    return this.configAxios()
      .post('/login', { id: this.user, password: this.password })
      .then(r => r.data)
      .catch(err => {
        displayRestError(err);
        return undefined;
      });
  }

  async apiGET<R>(url: string, query: Record<string, string | number>, retries = 1): Promise<R | undefined> {
    const run = () =>
      this.configAxios()
        .get(url, { params: query })
        .then(response => response.data);

    return this.apiAttempt(run, retries);
  }

  async apiPOST<PD extends object, R>(url: string, postData: PD, retries = 1): Promise<R | undefined> {
    const run = () =>
      this.configAxios()
        .post(url, postData)
        .then(response => response.data);

    return this.apiAttempt(run, retries);
  }

  async apiAttempt<R>(apiCall: () => Promise<R>, retries: number): Promise<R | undefined> {
    if (retries === 0) return undefined;

    await this.getCredentials();

    return apiCall()
      .catch(error => {
        displayRestError(error);
        this.credentials = undefined;
        putStrLn(`API Error ${error}: retries=${retries} `);
        return this.apiAttempt(apiCall, retries - 1);
      });
  }
}


function isAxiosError(error: any): error is AxiosError {
  return error.isAxiosError !== undefined && error.isAxiosError;
}

export function displayRestError(error: ErrorTypes): void {
  if (isAxiosError(error)) {
    console.log('HTTP Request Error: ');
    const { response } = error;
    if (response !== undefined) {
      const { status, statusText, data } = response;
      console.log(`Error: ${status}/${statusText}`);
      console.log(data);
    }
    return;
  }

  console.log(error);
}
