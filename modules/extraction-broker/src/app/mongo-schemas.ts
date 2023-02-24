import _ from 'lodash';
import { Schema, model } from 'mongoose';
import { prettyPrint } from '~/util/pretty-print';

import * as G from './grobid-schemas';

export const AttributesSchema = new Schema<G.Attributes>({
  'type': { type: String, required: false },
  'level': { type: String, required: false },
  'unit': { type: String, required: false },
  'xml:id': { type: String, required: false },
});

export const ElemSchema = new Schema<G.Elem>({
  _attributes: AttributesSchema,
  _text: { type: String, required: false },
});

export const PersNameSchema = new Schema<G.PersName>({
  persName: {
    forename: ElemSchema,
    surname: ElemSchema,
  }
});

export const AnalyticSchema = new Schema<G.Analytic>({
  title: ElemSchema,
  author: [PersNameSchema]
});

export const DateAttrSchema = new Schema<G.DateAttr>({
  'type': { type: String, required: true },
  'when': { type: String, required: true },
});

export const DateElemSchema = new Schema<G.DateElem>({
  _attributes: DateAttrSchema,
  _text: { type: String, required: false },
});

export const ImprintSchema = new Schema<G.Imprint>({
  biblScope: ElemSchema,
  date: DateElemSchema
});

export const MonogrSchema = new Schema<G.Monogr>({
  title: ElemSchema,
  imprint: ImprintSchema
});

export type SavedReference = G.Reference & {
  _id: string;
  pdfFile: string;
  pdfSha1: string;
};

export const ReferenceSchema = new Schema<SavedReference>({
  _id: { type: String },
  pdfFile: { type: String, required: true },
  pdfSha1: { type: String, required: true },
  _attributes: AttributesSchema,
  analytic: AnalyticSchema,
  monogr: MonogrSchema
}, {
  collection: 'references'
});

export const References = model<G.Reference>('Reference', ReferenceSchema);


export interface SavedPdf {
  _id: string;
  pdfFile: string;
  pdfSha1: string;
}

export const SavedPdfSchema = new Schema<SavedPdf>({
  _id: { type: String },
  // pdfFile: { type: String, required: true },
  // pdfSha1: { type: String, required: true },
}, {
  collection: 'pdfs',
});

export const SavedPdfs = model<SavedPdf>('SavedPdf', SavedPdfSchema);

export async function createCollections() {
  await References.createCollection();
  await SavedPdfs.createCollection();
}

export async function insertPdfReferences(pdf: string, refs: G.Reference[]) {
  await SavedPdfs.findOneAndUpdate(
    { _id: pdf },
    { _id: pdf },
    { upsert: true }
  );

  const result = await References.insertMany(refs);
  prettyPrint({ msg: 'Insert References', result });
}
