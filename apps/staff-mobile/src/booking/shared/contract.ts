import type { InvoiceInput } from '@ab/schedule';

// The booking-type / invoice contract (R-SCH-10, R-PAY-03, R-MSG-06) lives in @ab/shared; the
// type below is mobile-only (the wizard's invoice draft); POST /booking is BookingRequest.
export type { BookingKind, InvoiceInput, ThreadMediaItem } from '@ab/schedule';

/** The invoice the wizard holds: its input, plus what the preview needs. */
export type InvoiceDraft = InvoiceInput & {
  mime: string;
  /** A local photo, or the chat file's signed thumbnail; null for a PDF or an unloaded thumbnail. */
  uri: string | null;
};
