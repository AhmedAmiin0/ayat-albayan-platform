import { bookingInvoiceInput } from '@ab/client-core';
import type { Duration } from '@ab/shared';
import type { InvoiceInput } from './contract';

/** The invoice picked in the wizard: uploaded from the device, or a chat message the API copies. */
export type InvoiceDraft =
  | { source: 'upload'; path: string; name: string; mime: string; preview: string | null }
  | { source: 'whatsapp'; messageId: string; mime: string; preview: string | null };

/** The missed lesson a makeup replaces (its length and teacher preselect the rest). */
export interface MissedPick {
  lessonId: string;
  startsAt: string;
  teacherId: string;
  durationMin: Duration;
}

/** The invoice as POST /booking takes it: the upload's path or the chat message (@ab/client-core, docs/27 E5). */
export const invoiceInput: (i: InvoiceDraft) => InvoiceInput = bookingInvoiceInput;
