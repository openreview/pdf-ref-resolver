/**
 * Run REST operations against OpenReview
 */

import _ from 'lodash';
import { ConfigType } from '~/util/config';
import { OpenReviewExchange } from './openreview-exchange';
import df from 'd-forest';

import * as api1 from './openreview-api1';
import * as api2 from './openreview-api2';

interface TitleSearchParams {
  term: string;
  source: string;
  offset: number;
  limit: number;
}

type Path = Array<string | number>;

/**
 * Somewhat hacky function to make the api2.openreview.net results
 * look the same as the original api.openreview.net results.
 * The only difference is that some fields get an extra level
 * of nesting, like this:
 *     { title: 'My Title' }
 * becomes:
 *     { title: { value: 'My Title' } }
 *
 * This function looks for all nodes with an object with a 'value' field,
 * and replaces that object with the value of the value field
 */
function reshapeApi2Notes(api2Notes: api2.Note[]): api1.Note[] {
  return api2Notes.map(api2Note => {
    const init: Path[] = [];

    // Find all paths to nodes with a 'value' field
    const paths: Path[][] = df.reduce(
      api2Note,
      (acc: Path[], node: any, _depth: number, path: Path) => {
        const isContentPath = path.includes('content');
        if (node.value && isContentPath) {
          return _.concat(acc, path)
        }
        return acc;
      },
      init
    );
    const nonEmptyPaths = paths.filter(p => p.length > 0);

    const toUpdate: Path[] = nonEmptyPaths as any[];

    let updatedApiResults = api2Note;

    // Update each path with the flattened value
    toUpdate.forEach(path => {
      updatedApiResults = df.updateByPath(
        updatedApiResults,
        path,
        (node) => {
          return node.value ? node.value : node;
        }
      );
    });

    // We are messing with the type system big time here...
    return updatedApiResults as any;
  });
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

  async queryNotesForTitle(params: Partial<TitleSearchParams>): Promise<api1.Note[]> {
    const api1Results: any = await this.openExchange.apiGET('/notes/search', { ...params });
    const api2Results: any = await this.openExchange.api2GET('/notes/search', { ...params });

    const notes1: api1.Note[] = api1Results.notes;
    const notes2: api2.Note[] = api2Results.notes;
    const notes2Reshaped = reshapeApi2Notes(notes2);

    notes1.forEach(note => {
      note.content.authors = note.content.authors || [];
      note.content.authorids = note.content.authorids || [];
      note.apiSource = 'api.openreview.net';
    });

    notes2Reshaped.forEach(note => {
      note.content.authors = note.content.authors || [];
      note.content.authorids = note.content.authorids || [];
      note.apiSource = 'api2.openreview.net';
    });

    return _.concat(notes1, notes2Reshaped);
  }
}
