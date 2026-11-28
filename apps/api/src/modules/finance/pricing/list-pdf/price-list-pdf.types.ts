import type { PriceListPdfBody } from '@ab/shared';

/** A price as printed: the amount after the discount, and the struck total only with one. */
export interface PdfPrice {
  now: string;
  was: string | null;
}

/** The row's highlight: the popular tier, the best-value tier, or none. */
export type PdfTone = 'popular' | 'featured' | null;

export interface PdfTierRow {
  name: string;
  tagline: string;
  lessons: string;
  cadence: string;
  tone: PdfTone;
  /** One per lesson length, in the column order; null when that length has no such package. */
  prices: (PdfPrice | null)[];
}

export interface PdfPackageCard {
  name: string;
  lessons: string;
  tagline: string;
  /** One entry per lesson length; the weekly card has a single one. */
  tiles: { duration: string; price: PdfPrice }[];
}

export interface PdfFooterContact {
  whatsapp: string;
  /** Absent when the academy has no site set. */
  site?: string;
}

/** Everything the price list PDF prints; no student or guardian data (docs/08 §3b). */
export interface PriceListPdfModel {
  /** The country's flag emoji; empty for a USD list without a country. */
  flag: string;
  pricedIn: string;
  symbol: string;
  /** The gold pill; null without a discount. */
  discount: string | null;
  caption: string;
  /** Minutes of each price column, in the list's order. */
  durations: string[];
  rows: PdfTierRow[];
  weekly: PdfPackageCard | null;
  monthly: PdfPackageCard | null;
  contact: PdfFooterContact;
}

export interface PdfModelInput {
  /** The asked ISO code; a code outside the site is listed in USD under its own name. */
  country: string | undefined;
  contact: PdfFooterContact;
}

export interface PriceListPdfInput {
  body: PriceListPdfBody;
  /** The caller: the PDF is stored under their chat files. */
  actorId: string;
}
