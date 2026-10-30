import type { InvoiceInput } from '@ab/shared';

/**
 * The booking wizard's invoice as POST /booking takes it (both apps, docs/27 E5): the signed path of the upload,
 * or the chat message the API copies; the draft's preview fields (name, mime, preview / uri) are left out.
 */
export function bookingInvoiceInput(invoice: InvoiceInput): InvoiceInput {
  return invoice.source === 'upload' ? { source: 'upload', path: invoice.path } : { source: 'whatsapp', messageId: invoice.messageId };
}
