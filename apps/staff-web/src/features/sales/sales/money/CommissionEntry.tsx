import { formatAmount, walletStateStyle, type MyCommissionRow, type PaymentMethod } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { monthLabel } from '@/features/finance/payouts';
import { currencySymbol } from '@/features/finance/subscriptions';
import { formatDate } from '@/features/sales/leads';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';

const P = t.assistantPortal;
const W = P.wallet;
/** The wallet's short words («دفع إلكتروني», «تحويل بنكي»); the other methods' own words are short. */
const SHORT_METHOD: Partial<Record<PaymentMethod, string>> = W.method;

/** The chip's word: «مستحقة», «في كشف أكتوبر 2026», «مدفوعة» or «ملغاة». */
function stateWord(c: MyCommissionRow): string {
  if (c.state === 'in_statement' && c.statement_month) return W.state.in_statement.replace('{month}', monthLabel(c.statement_month.slice(0, 7)));
  return { due: P.commission.earned, in_statement: P.commission.earned, paid: W.state.paid, voided: P.commission.voided }[c.state];
}

/** After the student: the kind and how it was paid; a voided entry says why instead, in short. */
function details(c: MyCommissionRow): string[] {
  if (c.state === 'voided') return [c.void_reason ? W.voided[c.void_reason] : W.voidedByAdmin];
  const kind = c.kind === 'first' ? t.assistants.ledger.kind.first : t.assistants.ledger.kind.renewal.replace('{n}', String(c.share_percent));
  return [kind, ...(c.method ? [SHORT_METHOD[c.method] ?? t.enums.paymentMethod[c.method]] : [])];
}

/**
 * One commission of «عمولاتي» in two lines (WhatsApp-compact, ≥ 44px): «+50 ج.م», the day and its state
 * chip, then «AB-1022 · lmkl · أول اشتراك · دفع إلكتروني», short enough for a phone. A voided one is struck
 * through with no sign, and says why.
 */
export function CommissionEntry({ entry }: { entry: MyCommissionRow }) {
  const voided = entry.state === 'voided';
  return (
    <li className="grid min-h-11 content-center gap-0.5 border-b border-rule py-2.5">
      <div className="flex items-center gap-3">
        <span className={cn('whitespace-nowrap font-bold', voided ? 'text-ink-3 line-through' : 'text-ink')}>
          <Ltr>{`${voided ? '' : '+'}${formatAmount(entry.amount)}`}</Ltr> {currencySymbol(entry.currency)}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-ink-2">{formatDate(entry.earned_at)}</span>
        <StatusChip size="sm" {...walletStateStyle[entry.state]} label={stateWord(entry)} />
      </div>
      <p className="truncate text-xs text-ink-2">
        <Ltr>{entry.student.code}</Ltr> · <bdi>{entry.student.name}</bdi>
        {details(entry).map((d) => ` · ${d}`).join('')}
      </p>
    </li>
  );
}
