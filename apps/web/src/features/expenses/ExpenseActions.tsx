import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import type { ExpenseView } from './api';

export type ExpenseAction = 'edit' | 'delete' | 'confirm' | 'receipt';
type Props = { expense: ExpenseView; onAction: (e: ExpenseView, action: ExpenseAction) => void };

/** One expense's actions: confirm a monthly draft, its receipt, edit, delete. */
export function ExpenseActions({ expense: e, onAction }: Props) {
  return (
    <span className="flex flex-wrap gap-1.5" data-draft={e.is_draft ? '' : undefined}>
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
    </span>
  );
}
