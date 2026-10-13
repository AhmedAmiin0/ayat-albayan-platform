import type { PaymentAttachmentView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { isPdfName } from './receipt-file';

export interface AttachmentRow {
  view: PaymentAttachmentView;
  /** «الإيصال» for the legacy receipt, else «مرفق n» counting only the new files (web AttachmentsDialog). */
  label: string;
  /** Opened outside the app; an image shows inline. */
  pdf: boolean;
}

/** The mime says which; a legacy row may have none, then the signed URL's `.pdf` does. */
export function isPdfAttachment(a: Pick<PaymentAttachmentView, 'mime' | 'url'>): boolean {
  return a.mime === null ? isPdfName(a.url) : a.mime === 'application/pdf';
}

/** The payment's «المرفقات» as the viewer lists them, in the API's order. */
export function attachmentRows(list: readonly PaymentAttachmentView[]): AttachmentRow[] {
  let n = 0;
  return list.map((view) => {
    if (!view.legacy) n += 1;
    const label = view.legacy ? t.payments.legacyReceipt : t.payments.attachmentN.replace('{n}', String(n));
    return { view, label, pdf: isPdfAttachment(view) };
  });
}
