import type { PublicPaymentLink } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { checkoutUrl } from '../api';
import { fillText, moneySlots } from '../link-text';

const P = t.paymentLinks.pay;

type Props = { token: string; link: PublicPaymentLink; payable: boolean };

/** The greeting, the amount and the lessons; «ادفع الآن» while payable: a navigation to the API's checkout. */
export function PayDetails({ token, link, payable }: Props) {
  return (
    <div className="grid gap-3 rounded-lg border border-rule bg-card p-5">
      <p className="text-body font-semibold text-ink">{fillText(P.greeting, { name: link.first_name })}</p>
      <p className="font-display text-[24px] font-bold leading-tight text-ink">{fillText(P.amount, moneySlots(link.amount, link.currency))}</p>
      <p className="text-sm text-ink-2">{fillText(t.paymentLinks.lessons, { count: link.lessons })}</p>
      {payable && (
        <Button asChild size="lg" className="justify-self-stretch sm:justify-self-start">
          <a href={checkoutUrl(token)}>{P.button}</a>
        </Button>
      )}
    </div>
  );
}
