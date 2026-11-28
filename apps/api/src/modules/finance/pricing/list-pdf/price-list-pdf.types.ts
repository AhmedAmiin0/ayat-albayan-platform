import type { PriceListPdfBody } from '@ab/shared';

export interface PdfPriceRow {
  name: string;
  lessons: string;
  /** The price before the discount, struck through; null without a discount. */
  before: string | null;
  after: string;
}

export interface PdfPriceGroup {
  title: string;
  rows: PdfPriceRow[];
}

/** Everything the price list PDF prints; no student or guardian data (docs/08 §3b). */
export interface PriceListPdfModel {
  country: string;
  currency: string;
  /** YYYY-MM-DD on the Riyadh calendar. */
  issued: string;
  /** The header line; null without a discount, so the table has one price column. */
  discount: string | null;
  students: number;
  groups: PdfPriceGroup[];
  note: string;
}

export interface PdfModelInput {
  /** The asked ISO code; a code outside the site is listed in USD under its own name. */
  country: string | undefined;
  now: Date;
}

export interface PriceListPdfInput {
  body: PriceListPdfBody;
  /** The caller: the PDF is stored under their chat files. */
  actorId: string;
}
