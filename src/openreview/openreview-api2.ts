type Value<T> = {
  value: T
};

export interface NoteContent {
  'abstract'?: Value<string>;
  pdf?: string;
  html?: string; // this is a URL
  venueid: string;
  title: Value<string>;
  authors?: Value<string[]>;
  authorids?: Value<string[]>;
  tcdate: number;
  venue: string;
  _bibtex: string;
}

export interface Note {
  id: string;
  content: NoteContent;
  apiSource?: string;
}

export interface Notes {
  notes: Note[];
  count: number;
}
