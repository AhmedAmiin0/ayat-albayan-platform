import { moneyText } from '@/features/finance/subscriptions';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** On an open monthly payout, the part already paid per lesson (docs/11 §10). */
export function LedgerPaid({ amount }: { amount: number | undefined }) {
  if (!amount) return null;
  return <span className="text-2xs text-ink-3">{t.earnings.ledgerPaid.replace('{amount}', moneyText(amount, 'EGP'))}</span>;
}
