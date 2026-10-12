import { PAYOUT_STATUSES, payoutStatusStyle } from '@ab/shared';
import { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { currentMonth } from '@/finance/month';
import { MonthPicker } from '@/finance/MonthPicker';
import { t } from '@/lib/i18n';
import { LoadState } from '@/sales-money/LoadState';
import { useStatements, type AssistantRow, type StatementFilter } from './api';
import { AssistantPills } from './AssistantPills';
import { GenerateBar } from './GenerateBar';
import { generateTargets } from './generate-targets';
import { PayStatementForm } from './PayStatementForm';
import type { StatementCan } from './statement-can';
import { StatementItem } from './StatementItem';
import { StatusPills } from './StatusPills';

export interface StatementsPanelProps {
  assistants: readonly AssistantRow[];
  /** One salesperson's own page: no salesperson filter. */
  assistantId?: string;
  can: StatementCan;
  onNotice: (text: string) => void;
}

/** «الكشوف الشهرية» (web StatementsPanel): a month's statements: generate, approve, pay with receipt, reopen, un-pay. */
export function StatementsPanel({ assistants, assistantId = '', can, onNotice }: StatementsPanelProps) {
  const [filter, setFilter] = useState<StatementFilter>({ assistantId, month: currentMonth(), status: '' });
  const [payingId, setPayingId] = useState<string | null>(null);
  const set = (patch: Partial<StatementFilter>) => setFilter((f) => ({ ...f, ...patch }));
  const chosen = assistantId || filter.assistantId;
  const list = useStatements({ ...filter, assistantId: chosen });
  const rows = list.data ?? [];
  const paying = rows.find((s) => s.id === payingId);
  if (paying) {
    const done = () => {
      setPayingId(null);
      onNotice(t.mobileSalesMoney.done.pay);
    };
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <PayStatementForm statement={paying} onDone={done} onCancel={() => setPayingId(null)} />
      </ScrollView>
    );
  }
  const ids = chosen ? [chosen] : assistants.map((a) => a.id);
  return (
    <FlatList
      accessibilityLabel={t.assistants.tabs.statements}
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
      data={rows}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => <StatementItem statement={item} can={can} onPay={() => setPayingId(item.id)} onNotice={onNotice} />}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      ListHeaderComponent={
        <View accessibilityLabel={t.assistants.statements.filters} style={{ gap: 8, paddingBottom: 12 }}>
          {assistantId ? null : <AssistantPills assistants={assistants} value={filter.assistantId} onChange={(id) => set({ assistantId: id })} />}
          <MonthPicker month={filter.month} onChange={(month) => set({ month })} />
          <StatusPills statuses={PAYOUT_STATUSES} labels={t.enums.payoutStatus} styles={payoutStatusStyle} value={filter.status} onChange={(status) => set({ status })} />
          {can.write ? (
            <GenerateBar targets={generateTargets(ids, rows)} month={filter.month} hasRows={rows.length > 0} disabled={assistants.length === 0} onNotice={onNotice} />
          ) : null}
        </View>
      }
      ListEmptyComponent={<LoadState status={list} empty emptyTitle={t.assistants.statements.empty} />}
    />
  );
}
