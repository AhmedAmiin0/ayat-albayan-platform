import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { MonthRow } from './MonthRow';
import { activeMonths } from './summary-lines';
import type { FinanceSummary } from './summary-types';

/** «الإيرادات والتكلفة حسب الشهر»: months with money, newest first; «لا توجد بيانات» for a quiet year. */
export function SummaryMonths({ finance }: { finance: FinanceSummary['finance'] }) {
  const months = activeMonths(finance.by_month);
  return (
    <Section title={t.dashboard.byMonth}>
      <View style={{ marginHorizontal: -16 }}>
        {months.map((m) => (
          <MonthRow key={m.month} month={m} currency={finance.currency} />
        ))}
      </View>
      {months.length === 0 ? <Note>{t.dashboard.noData}</Note> : null}
    </Section>
  );
}
