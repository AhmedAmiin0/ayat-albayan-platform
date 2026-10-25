import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { LoadState } from '@/sales-money/LoadState';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useAssistants } from './api';
import { AssistantTabBody, type AssistantTab as Tab } from './AssistantTabBody';
import { useStatementCan } from './statement-can';

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
      <AssistantTabBody tab={tab} assistant={assistant} can={can} onNotice={setNotice} />
    </Screen>
  );
}
