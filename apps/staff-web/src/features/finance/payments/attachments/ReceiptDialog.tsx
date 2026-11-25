import { useQuery } from '@tanstack/react-query';
import { Dialog, FormAlert, t } from '@ab/web-kit';
import { moneyKeys } from '@/features/finance/keys';
import { apiErrorText, studentLabel } from '@/features/finance/subscriptions';
import { receiptUrl, type PaymentView } from '@/features/finance/payments/api';

/** A stored receipt through a 1-hour signed URL (P7): the image inline, a PDF in a frame. */
export function ReceiptDialog({ payment, onClose }: { payment: PaymentView; onClose: () => void }) {
  const signed = useQuery({
    queryKey: moneyKeys.receipt(payment.id),
    queryFn: () => receiptUrl(payment.id),
    staleTime: 30 * 60_000,
  });
  const pdf = payment.receipt_path?.endsWith('.pdf') ?? false;

  return (
    <Dialog title={t.payments.receipt} description={studentLabel(payment.student)} onClose={onClose} layout="center">
      {signed.isError && <FormAlert>{apiErrorText(signed.error, t.payments.error)}</FormAlert>}
      {signed.isPending && <p className="text-ink-3">{t.common.loading}</p>}
      {signed.data &&
        (pdf ? (
          <iframe title={t.payments.receipt} src={signed.data.url} className="h-[70vh] w-full rounded-sm border border-rule" />
        ) : (
          <img src={signed.data.url} alt={t.payments.receipt} className="mx-auto max-h-[70vh] w-auto rounded-sm border border-rule" />
        ))}
      {signed.data && (
        <a href={signed.data.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-lapis underline underline-offset-4">
          {t.payments.openReceipt}
        </a>
      )}
    </Dialog>
  );
}
