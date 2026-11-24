import type { PaymentAttachmentView } from '@ab/money';
import { t } from '@ab/mobile-kit';
import { isPdfName } from './receipt-file';

export interface AttachmentRow {
  view: PaymentAttachmentView;
  /** Counting only new files, as the web AttachmentsDialog. */
  label: string;
  /** Opened outside the app; an image shows inline. */
  pdf: boolean;
}

/** The mime says which; a legacy row may have none, then the signed URL's `.pdf` does. */
export function isPdfAttachment(a: Pick<PaymentAttachmentView, 'mime' | 'url'>): boolean {
  return a.mime === null ? isPdfName(a.url) : a.mime === 'application/pdf';
}

/** Keeps the API's order. */
export function attachmentRows(list: readonly PaymentAttachmentView[]): AttachmentRow[] {
  let n = 0;
  return list.map((view) => {
    if (!view.legacy) n += 1;
    const label = view.legacy ? t.payments.legacyReceipt : t.payments.attachmentN.replace('{n}', String(n));
    return { view, label, pdf: isPdfAttachment(view) };
  });
}
