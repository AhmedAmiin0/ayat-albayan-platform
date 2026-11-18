import { signedAmount } from '@ab/client-core';
import type { PortalPayment } from '@ab/shared';
import { moneyText } from '@ab/web-kit/lib/money-text';
import { FAM_CARD, FAM_CARD_TITLE } from '@ab/web-kit/family/panels/panel-look';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { dayText } from './package-text';

/**
 * «سجل المدفوعات»: date, kind and amount, newest first; a refund is a minus. None: hidden. The
 * family look (board PortalWebPackage): one card with a green top edge, rows split by hairlines.
 */
export function PaymentsList({ payments }: { payments: PortalPayment[] }) {
  if (payments.length === 0) return null;
  return (
    <section aria-label={t.portal.payments} className={cn('grid gap-2', FAM_CARD.green)}>
      <h3 className={cn('text-sm font-semibold text-ink-2', FAM_CARD_TITLE)}>{t.portal.payments}</h3>
      <ul
        className="grid divide-y divide-rule rounded-lg border border-rule bg-raised family:rounded-none
          family:border-0"
      >
        {payments.map((p, i) => (
          <li
            key={`${p.paid_at}-${String(i)}`}
            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm family:px-1
              family:py-3.5"
          >
            <span className="grid gap-0.5 family:gap-0">
              <span className="font-semibold family:text-body family:font-bold">
                {dayText(p.paid_at.slice(0, 10))}
              </span>
              <span className="text-xs text-ink-3 family:text-[13px]">{t.enums.paymentKind[p.kind]}</span>
            </span>
            <bdi className="font-semibold tabular-nums family:text-[17px] family:font-extrabold">{moneyText(signedAmount(p), p.currency)}</bdi>
          </li>
        ))}
      </ul>
    </section>
  );
}
