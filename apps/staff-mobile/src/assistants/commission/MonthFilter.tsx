import { View } from 'react-native';
import { currentMonth } from '@/finance/shared/month';
import { MonthPicker } from '@/finance/shared/MonthPicker';
import { t, FilterPills } from '@ab/mobile-kit';

type Span = 'all' | 'one';

/** Empty string means every month. */
export function MonthFilter({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
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
