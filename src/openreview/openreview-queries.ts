/**
 * Run REST operations against OpenReview
 */

import { ConfigType } from '~/util/config';
import { OpenReviewExchange } from './openreview-exchange';

interface TitleSearchParams {
  term: string;
  source: string;
  offset: number;
  limit: number;
}

export class OpenReviewQueries {
  openExchange: OpenReviewExchange;

  constructor(config: ConfigType) {
    this.openExchange = new OpenReviewExchange(config);
  }

  async login(): Promise<boolean> {
    await this.openExchange.getCredentials();
    return this.openExchange.credentials !== undefined;
  }

  async queryNotesForTitle(params: Partial<TitleSearchParams>): Promise<any> {
    return this.openExchange.apiGET('/notes/search', { ...params });
  }
}
