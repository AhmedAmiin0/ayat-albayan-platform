import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { LoadState } from '@/sales-money/LoadState';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { FilterPills } from '@/ui/FilterPills';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { useAssistants } from './api';
import { CommissionLedger } from './CommissionLedger';
import { useStatementCan } from './statement-can';
import { StatementsPanel } from './StatementsPanel';
import { TermsEditor } from './TermsEditor';
import { TermsView } from './TermsView';

type Tab = 'terms' | 'commissions' | 'statements';

const TABS = (): { value: Tab; label: string }[] => [
  { value: 'terms', label: t.mobileSalesMoney.tabs.terms },
  { value: 'commissions', label: t.assistants.tabs.commissions },
  { value: 'statements', label: t.assistants.tabs.statements },
];

/** One salesperson (web /admin/assistants/:id): terms (edited with assistantpay.write), their commissions, their statements. */
export function AssistantDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('terms');
  const [notice, setNotice] = useState<string | null>(null);
  const can = useStatementCan();
  const list = useAssistants();
  const assistant = list.data?.find((a) => a.id === id);
  const back = <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />;
  if (!assistant) {
    return (
      <Screen>
        <ScreenHeader title={t.assistants.title} trailing={back} />
        {list.data ? <ErrorState message={t.assistants.notFound} onRetry={() => void list.refetch()} /> : <LoadState status={list} empty={false} emptyTitle="" />}
      </Screen>
    );
  }
  const show = (next: Tab) => {
    setNotice(null);
    setTab(next);
  };
  return (
    <Screen>
      <ScreenHeader title={assistant.name} trailing={back} />
      <FilterPills items={TABS()} value={tab} onChange={show} accessibilityLabel={t.mobileSalesMoney.tabs.label} />
      {notice ? <Note>{notice}</Note> : null}
      {tab === 'terms' && can.write ? <TermsEditor key={assistant.id} assistant={assistant} onNotice={setNotice} /> : null}
      {tab === 'terms' && !can.write ? <TermsView terms={assistant.terms} /> : null}
      {tab === 'commissions' ? <CommissionLedger assistantId={assistant.id} canWrite={can.write} onNotice={setNotice} /> : null}
      {tab === 'statements' ? <StatementsPanel assistants={[assistant]} assistantId={assistant.id} can={can} onNotice={setNotice} /> : null}
    </Screen>
  );
}
