import { View } from 'react-native';
import { currentMonth } from '@/finance/month';
import { MonthPicker } from '@/finance/MonthPicker';
import { t } from '@/core/lib/i18n/i18n';
import { FilterPills } from '@/core/ui/form/FilterPills';

type Span = 'all' | 'one';

/** The ledger's month (web FilterBar with «كل الأشهر»): every month (''), or one picked with the arrows. */
export function MonthFilter({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const items: { value: Span; label: string }[] = [
    { value: 'all', label: t.assistants.ledger.allMonths },
    { value: 'one', label: t.mobileSalesMoney.oneMonth },
  ];
  return (
    <View style={{ gap: 8 }}>
      <FilterPills
        items={items}
        value={month === '' ? 'all' : 'one'}
        onChange={(span) => onChange(span === 'all' ? '' : currentMonth())}
        accessibilityLabel={t.assistants.ledger.month}
      />
      {month === '' ? null : <MonthPicker month={month} onChange={onChange} />}
    </View>
  );
}
