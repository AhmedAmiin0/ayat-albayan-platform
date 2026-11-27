import { signedAmount } from '@ab/client-core';
import { moneyText } from '@ab/web-kit/lib/money-text';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { dayText } from '@ab/web-kit/portal/package/package-text';
import type { PaymentsListProps } from './PaymentsList.types';

/** Newest first; a refund is a minus; hidden when there are none. */
export function PaymentsList({ payments }: PaymentsListProps) {
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
            <bdi className="font-semibold tabular-nums">
              {moneyText(signedAmount(p), p.currency)}
            </bdi>
          </li>
        ))}
      </ul>
    </section>
  );
}
