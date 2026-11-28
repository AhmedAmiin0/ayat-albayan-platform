import type { PriceListChoice } from '@ab/client-core';
import type { PriceListPdfResponse } from '@ab/shared';

export interface QuotePdfProps {
  phone: string;
  /** The list on screen: a PDF made for another choice is dropped. */
  choice: PriceListChoice;
  /** The 24 h window is open: no → the PDF opens but is not sent. */
  open: boolean;
  onSent: () => void;
}

/** The stored PDF, its request id (the chat send reuses it) and the choice it was made for. */
export interface MadePdf extends PriceListPdfResponse {
  id: string;
  choice: PriceListChoice;
}
