import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { useUploadMaxBytes } from '@/core/lib/query/public-config';
import { isOffline } from '@/core/lib/money/payment-errors';
import { pickReceipt, type Receipt, type ReceiptSource } from '@/core/lib/receipts/receipt';
import type { InvoiceDraft } from '@/booking/shared/contract';
import { uploadInvoice } from './invoice-upload';

/**
 * The invoice step's phone side: pick a photo (camera or gallery), refuse one over 10 MB, upload it
 * under the wizard's request id. A failed upload (offline included) keeps the photo in `pending`,
 * so `upload(pending)` retries the same bytes without picking again.
 */
export function useInvoiceUpload(requestId: string, onUploaded: (invoice: InvoiceDraft) => void) {
  const [pending, setPending] = useState<Receipt | null>(null);
  const maxBytes = useUploadMaxBytes();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(receipt: Receipt) {
    setPending(receipt);
    setBusy(true);
    setError(null);
    try {
      const path = await uploadInvoice(requestId, receipt);
      onUploaded({ source: 'upload', path, mime: receipt.mime, uri: receipt.uri });
      setPending(null);
    } catch (e) {
      setError(isOffline(e) ? t.booking.mobile.invoiceOffline : t.booking.mobile.invoiceUploadFailed);
    } finally {
      setBusy(false);
    }
  }

  async function pick(source: ReceiptSource) {
    setError(null);
    try {
      const picked = await pickReceipt(source);
      if (!picked) return;
      if (picked.size > maxBytes) setError(t.booking.error.invoice_too_large);
      else await upload(picked);
    } catch {
      setError(t.common.error);
    }
  }

  return { pending, busy, error, setError, upload, pick, clearPending: () => setPending(null) };
}
