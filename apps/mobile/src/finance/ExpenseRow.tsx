import type { ExpenseCategoryView, ExpenseView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { localDay } from '@/payments/format';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { ListRow } from '@/core/ui/layout/ListRow';
import { categoryLabel } from './categories';
import { amountText } from './format';

export interface ExpenseRowProps {
  expense: ExpenseView;
  categories: readonly ExpenseCategoryView[] | undefined;
}

/** «إعلانات · 250 ج.م»; under it the paid day, the vendor, «إيصال مرفق». A monthly draft wears «مسودة». */
export function ExpenseRow({ expense: e, categories }: ExpenseRowProps) {
  const parts = [
    e.paid_on ? localDay(e.paid_on) : null,
    e.vendor,
    e.method ? t.enums.paymentMethod[e.method] : null,
    e.has_receipt ? t.mobileFinance.expenses.withReceipt : null,
  ];
  return (
    <ListRow
      title={`${categoryLabel(categories, e.category)} · ${amountText(e.amount, e.currency)}`}
      subtitle={parts.filter(Boolean).join(' · ') || (e.note ?? '')}
      trailing={e.is_draft ? <StatusChip tone="neutral" glyph="hollow" label={t.finance.draft} size="sm" /> : undefined}
    />
  );
}
