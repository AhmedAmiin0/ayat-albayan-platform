import { router } from 'expo-router';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Button } from '@/core/ui/primitives/Button';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useAssistants } from '@/assistants/api/api';
import { AssistantsList } from '@/assistants/list/AssistantsList';
import { CommissionLedger } from '@/assistants/commission/CommissionLedger';
import { useStatementCan } from '@/assistants/statements/hooks/statement-can';
import { StatementsPanel } from '@/assistants/statements/components/StatementsPanel';

type Tab = 'list' | 'commissions' | 'statements';

const TABS = (): { value: Tab; label: string }[] => [
  { value: 'list', label: t.assistants.tabs.list },
  { value: 'commissions', label: t.assistants.tabs.commissions },
  { value: 'statements', label: t.assistants.tabs.statements },
];

/**
 * «فريق المبيعات» (admin, assistantpay.read; web /admin/assistants, R-ASST-05): the sales staff and
 * their terms, the commission ledger of all of them, the monthly statements. The server owns every rule.
 */
export function AssistantsScreen() {
  const [tab, setTab] = useState<Tab>('list');
  const [notice, setNotice] = useState<string | null>(null);
  const can = useStatementCan();
  const assistants = useAssistants().data ?? [];
  const show = (next: Tab) => {
    setNotice(null);
    setTab(next);
  };
  return (
    <Screen>
      <ScreenHeader title={t.assistants.title} trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />} />
      <FilterPills items={TABS()} value={tab} onChange={show} accessibilityLabel={t.assistants.tabs.label} />
      {notice ? <Note>{notice}</Note> : null}
      {tab === 'list' ? <AssistantsList /> : null}
      {tab === 'commissions' ? <CommissionLedger assistants={assistants} canWrite={can.write} onNotice={setNotice} /> : null}
      {tab === 'statements' ? <StatementsPanel assistants={assistants} can={can} onNotice={setNotice} /> : null}
    </Screen>
  );
}
