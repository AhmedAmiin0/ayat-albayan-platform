import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { t, BackButton, ErrorState, FilterPills, Screen, ScreenHeader } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { LoadState } from '@/sales-money/components/LoadState';
import { useAssistants } from '@/assistants/api/api';
import { AssistantTabBody, type AssistantTab as Tab } from '@/assistants/list/AssistantTabBody';
import { useStatementCan } from '@/assistants/statements/hooks/statement-can';

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
  const back = <BackButton onPress={() => router.back()} />;
  if (!assistant) {
    return (
      <Screen>
        <ScreenHeader title={t.assistants.title} leading={back} />
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
      <ScreenHeader title={assistant.name} leading={back} />
      <FilterPills
        items={TABS()}
        value={tab}
        onChange={show}
        accessibilityLabel={t.mobileSalesMoney.tabs.label}
      />
      {notice ? <Note>{notice}</Note> : null}
      <AssistantTabBody tab={tab} assistant={assistant} can={can} onNotice={setNotice} />
    </Screen>
  );
}
