import { Button } from '@/components/ui/button';
import { Amount } from '@/features/subscriptions/Amount';
import { t } from '@/lib/i18n';
import type { ExpenseView } from './api';

export type ExpenseAction = 'edit' | 'delete' | 'confirm' | 'receipt';
type Props = { expense: ExpenseView; label: string; onAction: (e: ExpenseView, action: ExpenseAction) => void };

/** One expense: category, amount, paid day and vendor, the repeat / draft marks, actions. */
export function ExpenseRow({ expense: e, label, onAction }: Props) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5" data-draft={e.is_draft ? '' : undefined}>
      <span className="min-w-28 font-semibold text-ink">{label}</span>
      <Amount amount={e.amount} currency={e.currency} className={e.is_draft ? 'text-ink-3' : undefined} />
      {e.is_draft && <span className="text-2xs font-semibold text-act">{t.finance.draftMark}</span>}
      {e.recurring && !e.is_draft && <span className="text-2xs text-ink-3">{t.finance.recurring}</span>}
      <span className="min-w-0 flex-1 text-sm text-ink-2">{[e.paid_on, e.vendor, e.note].filter(Boolean).join(' · ')}</span>
      {e.is_draft && (
        <Button type="button" variant="secondary" size="sm" onClick={() => onAction(e, 'confirm')}>
          {t.finance.confirmDraft}
        </Button>
      )}
      {e.has_receipt && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onAction(e, 'receipt')}>
          {t.payments.viewReceipt}
        </Button>
      )}
      <Button type="button" variant="ghost" size="sm" onClick={() => onAction(e, 'edit')}>
        {t.common.edit}
      </Button>
      <Button type="button" variant="danger-quiet" size="sm" onClick={() => onAction(e, 'delete')}>
        {t.common.delete}
      </Button>
    </li>
  );
}
