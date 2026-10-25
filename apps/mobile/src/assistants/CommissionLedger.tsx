import { ASSISTANT_COMMISSION_STATUSES } from '@ab/shared';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { LoadState } from '@/sales-money/components/LoadState';
import { useCommissions, type AssistantRow, type LedgerFilter } from './api';
import { AssistantPills } from './AssistantPills';
import { commissionStatusStyle } from './commission-style';
import { CommissionItem } from './CommissionItem';
import { CurrencyTotalsLine } from './CurrencyTotalsLine';
import { MonthFilter } from './MonthFilter';
import { StatusPills } from './StatusPills';
import { sumByCurrency } from './totals';

export interface CommissionLedgerProps {
  /** The list for the salesperson filter; omit on one salesperson's page and pass `assistantId`. */
  assistants?: readonly AssistantRow[];
  assistantId?: string;
  canWrite: boolean;
  onNotice: (text: string) => void;
}

/** «العمولات» (web CommissionLedger): salesperson / month / status filters, the cards, the earned total per currency. */
export function CommissionLedger({ assistants, assistantId = '', canWrite, onNotice }: CommissionLedgerProps) {
  const [filter, setFilter] = useState<LedgerFilter>({ assistantId, month: '', status: '' });
  const set = (patch: Partial<LedgerFilter>) => setFilter((f) => ({ ...f, ...patch }));
  const list = useCommissions({ ...filter, assistantId: assistantId || filter.assistantId });
  const rows = list.data ?? [];
  const L = t.assistants.ledger;
  return (
    <FlatList
      accessibilityLabel={t.assistants.tabs.commissions}
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: 8 }}
      data={rows}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => <CommissionItem commission={item} canWrite={canWrite} onNotice={onNotice} />}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      ListHeaderComponent={
        <View accessibilityLabel={L.filters} style={{ gap: 8, paddingBottom: 12 }}>
          {assistants && !assistantId ? <AssistantPills assistants={assistants} value={filter.assistantId} onChange={(id) => set({ assistantId: id })} /> : null}
          <MonthFilter month={filter.month} onChange={(month) => set({ month })} />
          <StatusPills
            statuses={ASSISTANT_COMMISSION_STATUSES}
            labels={L.status}
            styles={commissionStatusStyle}
            value={filter.status}
            onChange={(status) => set({ status })}
          />
        </View>
      }
      ListEmptyComponent={<LoadState status={list} empty emptyTitle={L.empty} />}
      ListFooterComponent={
        rows.length > 0 ? <CurrencyTotalsLine label={L.total} totals={sumByCurrency(rows, (r) => r.status === 'earned')} /> : <View style={{ height: 24 }} />
      }
    />
  );
}
