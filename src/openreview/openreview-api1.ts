
export interface NoteContent {
  'abstract'?: string;
  pdf?: string;
  html?: string; // this is a URL
  venueid: string;
  title: string;
  authors: string[];
  tcdate: number;
  authorids: string[];
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
