import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Cartouche } from '@/components/ui/display/cartouche';
import { PageHead } from '@/components/ui/layout/page';
import { Tabs } from '@/components/ui/layout/tabs';
import { t } from '@/lib/i18n';
import { assistantsQuery } from './api';
import { AssistantsList } from './AssistantsList';
import { CommissionLedger } from './CommissionLedger';
import { StatementsPanel } from './StatementsPanel';
import { useStatementCan } from './use-statement-can';

type Tab = 'list' | 'commissions' | 'statements';
const TABS: { value: Tab; label: string }[] = [
  { value: 'list', label: t.assistants.tabs.list },
  { value: 'commissions', label: t.assistants.tabs.commissions },
  { value: 'statements', label: t.assistants.tabs.statements },
];

/** /admin/assistants (R-ASST-05): the assistants and their terms, the commission ledger, the monthly statements. */
export function AssistantsPage() {
  const [tab, setTab] = useState<Tab>('list');
  const can = useStatementCan();
  const assistants = useQuery(assistantsQuery).data ?? [];
  return (
    <>
      <PageHead className="mb-3.5">
        <Cartouche>{t.assistants.title}</Cartouche>
      </PageHead>
      <Tabs label={t.assistants.tabs.label} tabs={TABS} value={tab} onChange={setTab} />
      <div role="tabpanel" aria-label={TABS.find((x) => x.value === tab)?.label} className="pt-4">
        {tab === 'list' && <AssistantsList />}
        {tab === 'commissions' && <CommissionLedger assistants={assistants} canWrite={can.write} />}
        {tab === 'statements' && <StatementsPanel assistants={assistants} can={can} />}
      </div>
    </>
  );
}
