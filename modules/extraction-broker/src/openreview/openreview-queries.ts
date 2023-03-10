/**
 * Run REST operations against OpenReview
 */

import { OpenReviewExchange } from "./openreview-exchange";

interface TitleSearchParams {
  term: string;
  source: string;
  offset: number;
  limit: number;
}

export class OpenReviewQueries {
  openExchange: OpenReviewExchange;

  constructor() {
    this.openExchange = new OpenReviewExchange();
  }

  async queryNotesForTitle(params: Partial<TitleSearchParams>): Promise<any> {
    return this.openExchange.apiGET('/notes/search', { ...params });
  }
}
