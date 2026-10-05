import type { TeacherPaymentView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { Pager } from '@/components/ui/pager';
import { formatDate } from '@/features/leads/format';
import { Amount } from '@/features/subscriptions/Amount';
import { apiErrorText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';
import { paymentsQuery, receiptUrl, type Scope } from './api';
import { VoidPaymentDialog } from './VoidPaymentDialog';

function Receipt({ scope, payment, onClose }: { scope: Scope; payment: TeacherPaymentView; onClose: () => void }) {
  const signed = useQuery({ queryKey: ['teacher-receipt', payment.id], queryFn: () => receiptUrl(scope, payment.id), staleTime: 30 * 60_000 });
  return (
    <Dialog title={t.payments.receipt} onClose={onClose} layout="center">
      {signed.isError && <FormAlert>{apiErrorText(signed.error, t.earnings.error)}</FormAlert>}
      {signed.isPending && <p className="text-ink-3">{t.common.loading}</p>}
      {signed.data && (
        <a href={signed.data.url} target="_blank" rel="noreferrer" className="text-sm text-lapis underline underline-offset-4">
          {t.payments.openReceipt}
        </a>
      )}
    </Dialog>
  );
}

/** Payments made to the teacher, newest first: date, amount, method, how many lessons, receipt. */
export function PaymentsHistory({ scope }: { scope: Scope }) {
  const [page, setPage] = useState(1);
  const [receipt, setReceipt] = useState<TeacherPaymentView | null>(null);
  const [voiding, setVoiding] = useState<TeacherPaymentView | null>(null);
  const list = useQuery(paymentsQuery(scope, page));
  return (
    <section aria-label={t.earnings.history}>
      <h2 className="mb-3 text-base font-semibold text-ink">{t.earnings.history}</h2>
      {list.isError && <FormAlert>{t.common.error}</FormAlert>}
      {list.data?.total === 0 && <p className="py-4 text-center text-ink-3">{t.earnings.noPayments}</p>}
      <ul className="grid">
        {list.data?.items.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-rule py-3" data-voided={p.voided_at ? '' : undefined}>
            <span className="tabular-nums text-ink-2">{formatDate(p.paid_at)}</span>
            <Amount amount={p.amount} currency="EGP" className={p.voided_at ? 'text-ink-3 line-through' : 'font-semibold'} />
            {p.voided_at && <span className="text-xs text-danger">{t.finance.voided.replace('{reason}', p.void_reason ?? '')}</span>}
            <span className="text-sm text-ink-2">{t.enums.paymentMethod[p.method]}</span>
            <span className="text-xs text-ink-3">
              {p.payout_id ? t.earnings.fromPayout : t.earnings.paymentSessions.replace('{count}', String(p.sessions))}
            </span>
            {p.note && <span className="text-xs text-ink-3">{p.note}</span>}
            <span className="ms-auto flex gap-1.5">
              {p.has_receipt && (
                <Button type="button" variant="secondary" size="sm" onClick={() => setReceipt(p)}>
                  {t.earnings.viewReceipt}
                </Button>
              )}
              {scope.kind === 'admin' && !p.voided_at && (
                <Button type="button" variant="danger-quiet" size="sm" onClick={() => setVoiding(p)}>
                  {t.finance.voidPayment}
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {list.data && <Pager page={list.data.page} total={list.data.total} pageSize={list.data.pageSize} onPage={setPage} />}
      {receipt && <Receipt scope={scope} payment={receipt} onClose={() => setReceipt(null)} />}
      {voiding && <VoidPaymentDialog payment={voiding} onClose={() => setVoiding(null)} />}
    </section>
  );
}
