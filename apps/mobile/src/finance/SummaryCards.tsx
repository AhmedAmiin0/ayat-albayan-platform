import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { useReceivables } from '@/money/queries';
import { Note } from '@/more/Note';
import { KpiCard } from './KpiCard';
import { useTeacherDues } from './queries';
import { summaryCards } from './summary-cards';
import { summaryWarnings } from './summary-lines';
import type { FinanceSummary } from './summary-types';

/** The year's four totals (reporting currency) and the two balances: owed to teachers, owed by students. */
export function SummaryCards({ finance }: { finance: FinanceSummary['finance'] | undefined }) {
  const dues = useTeacherDues();
  const owed = useReceivables();
  const missing = owed.data?.fx_missing ?? [];
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {summaryCards(finance, dues.data, owed.data).map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </View>
      {[...(finance ? summaryWarnings(finance) : []), ...(missing.length ? [t.finance.fxMissing.replace('{currencies}', missing.join(t.common.listSeparator))] : [])].map((w) => (
        <Note key={w}>{w}</Note>
      ))}
    </View>
  );
}
