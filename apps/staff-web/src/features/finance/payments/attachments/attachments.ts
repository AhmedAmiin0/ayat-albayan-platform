import { PAYMENT_ATTACHMENTS_MAX, type PaymentAttachmentView } from '@ab/shared';
import { useRef } from 'react';
import { t } from '@/lib/i18n/i18n';
import { receiptProblem } from './ReceiptField';

// A payment's «المرفقات» (owner 2026-10-12): optional, at most PAYMENT_ATTACHMENTS_MAX files, each checked like
// a receipt (image / PDF, settings.upload_max_mb) before any upload; the API checks them again.

export type AttachmentProblem = 'receipt_type' | 'receipt_too_large' | 'too_many_attachments';

/** The picked files added to the list (as `wrap` turns them into items); bad files are left out, the first problem returned. */
export function addAttachments<T>(
  list: readonly T[],
  picked: readonly File[],
  opts: { maxBytes: number; wrap: (file: File) => T },
): { list: T[]; problem: AttachmentProblem | null } {
  const next = [...list];
  let problem: AttachmentProblem | null = null;
  for (const file of picked) {
    const bad = receiptProblem(file, opts.maxBytes);
    if (bad) problem ??= bad;
    else if (next.length >= PAYMENT_ATTACHMENTS_MAX) problem ??= 'too_many_attachments';
    else next.push(opts.wrap(file));
  }
  return { list: next, problem };
}

/** The shown name of each stored file: the legacy receipt «الإيصال», then «مرفق 1»، «مرفق 2»… */
export function attachmentLabels(rows: readonly PaymentAttachmentView[]): string[] {
  let n = 0;
  return rows.map((r) => (r.legacy ? t.payments.legacyReceipt : t.payments.attachmentN.replace('{n}', String((n += 1)))));
}

export type Uploader = (input: { subscriptionId: string; file: File }) => Promise<string>;

/**
 * Uploads each file once per package: the retry after a lost reply re-sends the same paths instead of
 * uploading the files again (the clientRequestId then returns the payment already recorded).
 */
export function useUploadOnce(upload: Uploader): (subscriptionId: string, file: File) => Promise<string> {
  const done = useRef(new Map<File, { subscriptionId: string; path: string }>());
  return async (subscriptionId, file) => {
    const hit = done.current.get(file);
    if (hit?.subscriptionId === subscriptionId) return hit.path;
    const path = await upload({ subscriptionId, file });
    done.current.set(file, { subscriptionId, path });
    return path;
  };
}
