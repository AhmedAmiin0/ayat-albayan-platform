import type { WalletTotals } from '@ab/shared';
import { Amount } from '@/features/finance/subscriptions';
import { t } from '@/lib/i18n/i18n';

const W = t.assistantPortal.wallet;

/** Split «هذا الشهر {amount}» around its slot, so the amount stays an LTR island (Amount). */
function Slotted({ text, amount, currency }: { text: string; amount: number; currency: string }) {
  const [before = '', after = ''] = text.split('{amount}');
  return (
    <span>
      {before}
      <Amount amount={amount} currency={currency} />
      {after}
    </span>
  );
}

/**
 * «محفظتي»'s balance, one block per currency (never summed across them): «مستحق لك» and the amount, bold
 * and tabular, then «هذا الشهر X · دُفع لك Y». Nothing yet: «لا رصيد مستحق الآن». Below zero (a commission
 * voided after it was paid): «يُخصم من كشفك القادم» and the amount without a sign.
 */
export function WalletCard({ wallet }: { wallet: Readonly<Record<string, WalletTotals>> }) {
  const currencies = Object.keys(wallet).sort();
  return (
    <section aria-label={W.due} className="grid gap-3 rounded-lg border border-rule bg-raised p-4">
      {currencies.length === 0 && <p className="text-sm text-ink-2">{W.none}</p>}
      {currencies.map((currency) => {
        const w = wallet[currency];
        if (!w) return null;
        return (
          <div key={currency} data-currency={currency} className="grid min-h-11 content-center gap-0.5">
            <p className="flex flex-wrap items-baseline justify-between gap-x-4">
              <span className="text-sm font-semibold text-ink-2">{w.due < 0 ? W.owedBack : W.due}</span>
              <Amount amount={Math.abs(w.due)} currency={currency} className="text-h4 font-bold text-ink" />
            </p>
            <p className="flex flex-wrap gap-x-2 text-xs text-ink-2">
              <Slotted text={W.thisMonth} amount={w.this_month} currency={currency} />
              <span aria-hidden="true">·</span>
              <Slotted text={W.paid} amount={w.paid} currency={currency} />
            </p>
          </div>
        );
      })}
    </section>
  );
}
