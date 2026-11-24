import type { TeacherEarningsBalanceView } from '@ab/money';
import { View } from 'react-native';
import { t, FilterPills, type FilterPill } from '@ab/mobile-kit';
import { EarningsSummary } from './EarningsSummary';
import type { SessionFilter } from '@ab/client-core';

export type Tab = 'sessions' | 'payments';

const tabs = (): FilterPill<Tab>[] => [
  { value: 'sessions', label: t.earnings.mobile.sessions },
  { value: 'payments', label: t.earnings.mobile.payments },
];
const filters = (): FilterPill<SessionFilter>[] =>
  (['all', 'unpaid', 'paid'] as const).map((value) => ({ value, label: t.earnings.filter[value] }));

interface EarningsHeaderProps {
  balance: TeacherEarningsBalanceView | undefined;
  tab: Tab;
  onTab: (tab: Tab) => void;
  filter: SessionFilter;
  onFilter: (filter: SessionFilter) => void;
}

/** The list header: three cards, the sessions / payments switch, the sessions' status filter. */
export function EarningsHeader({ balance, tab, onTab, filter, onFilter }: EarningsHeaderProps) {
  return (
    <View style={{ gap: 12 }}>
      {balance ? <EarningsSummary balance={balance} /> : null}
      <FilterPills items={tabs()} value={tab} onChange={onTab} accessibilityLabel={t.earnings.title} />
      {tab === 'sessions' ? (
        <FilterPills items={filters()} value={filter} onChange={onFilter} accessibilityLabel={t.earnings.status} />
      ) : null}
    </View>
  );
}
