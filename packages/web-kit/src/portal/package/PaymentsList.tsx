import { signedAmount } from '@ab/client-core';
import type { PortalPayment } from '@ab/shared';
import { moneyText } from '#/lib/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { dayText } from './package-text';

/** «سجل المدفوعات»: date, kind and amount, newest first; a refund is a minus. None: hidden. */
export function PaymentsList({ payments }: { payments: PortalPayment[] }) {
  if (payments.length === 0) return null;
  return (
    <section aria-label={t.portal.payments} className="grid gap-2">
      <h3 className="text-sm font-semibold text-ink-2">{t.portal.payments}</h3>
      <ul className="grid divide-y divide-rule rounded-lg border border-rule bg-raised">
        {payments.map((p, i) => (
          <li
            key={`${p.paid_at}-${String(i)}`}
            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
          >
            <span className="grid gap-0.5">
              <span className="font-semibold">{dayText(p.paid_at.slice(0, 10))}</span>
              <span className="text-xs text-ink-3">{t.enums.paymentKind[p.kind]}</span>
            </span>
            <bdi className="font-semibold tabular-nums">{moneyText(signedAmount(p), p.currency)}</bdi>
          </li>
        ))}
      </ul>
    </section>
  );
}
