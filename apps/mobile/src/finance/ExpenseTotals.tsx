import type { ExpenseCategoryView, ExpenseView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { categoryLabel } from './categories';
import { totalsByCurrency } from './expense-math';
import { amountText } from './format';

export interface ExpenseTotalsProps {
  rows: readonly ExpenseView[];
  categories: readonly ExpenseCategoryView[] | undefined;
}

/** The month's total per currency, then the categories biggest first; drafts stay out. */
export function ExpenseTotals({ rows, categories }: ExpenseTotalsProps) {
  const { color } = useTheme();
  const totals = totalsByCurrency(rows);
  if (totals.length === 0) return rows.some((r) => r.is_draft) ? <Note>{t.mobileFinance.expenses.draftNote}</Note> : null;
  return (
    <View style={{ gap: 6, padding: 12, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: color.rule, backgroundColor: color.raised }}>
      {totals.map((c) => (
        <View key={c.currency} style={{ gap: 4 }}>
          <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.h3, color: color.ink, fontVariant: ['tabular-nums'] }}>
            {t.mobileFinance.expenses.monthTotal.replace('{amount}', amountText(c.total, c.currency))}
          </AppText>
          <Note>{t.mobileFinance.expenses.byCategory}</Note>
          {c.categories.map((k) => (
            <View key={k.category} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <AppText style={{ color: color.ink2, fontSize: type.size.sm }}>{categoryLabel(categories, k.category)}</AppText>
              <AppText style={{ color: color.ink, fontSize: type.size.sm, fontVariant: ['tabular-nums'] }}>{amountText(k.amount, c.currency)}</AppText>
            </View>
          ))}
        </View>
      ))}
      {rows.some((r) => r.is_draft) ? <Note>{t.mobileFinance.expenses.draftNote}</Note> : null}
    </View>
  );
}
