import type { AssistantRow } from '@/assistants/api/api';
import { CommissionLedger } from '@/assistants/commission/CommissionLedger';
import type { StatementCan } from '@/assistants/statements/hooks/statement-can';
import { StatementsPanel } from '@/assistants/statements/components/StatementsPanel';
import { TermsEditor } from '@/assistants/terms/TermsEditor';
import { TermsView } from '@/assistants/terms/TermsView';

export type AssistantTab = 'terms' | 'commissions' | 'statements';

interface AssistantTabBodyProps {
  tab: AssistantTab;
  assistant: AssistantRow;
  can: StatementCan;
  onNotice: (text: string) => void;
}

/** One salesperson's open tab: terms (edited with assistantpay.write, else read-only), commissions, statements. */
export function AssistantTabBody({ tab, assistant, can, onNotice }: AssistantTabBodyProps) {
  if (tab === 'commissions') return <CommissionLedger assistantId={assistant.id} canWrite={can.write} onNotice={onNotice} />;
  if (tab === 'statements') return <StatementsPanel assistants={[assistant]} assistantId={assistant.id} can={can} onNotice={onNotice} />;
  return can.write ? <TermsEditor key={assistant.id} assistant={assistant} onNotice={onNotice} /> : <TermsView terms={assistant.terms} />;
}
