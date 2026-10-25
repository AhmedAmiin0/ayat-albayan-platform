import type { AssistantRow } from '../api/api';
import { CommissionLedger } from '../commission/CommissionLedger';
import type { StatementCan } from '../statements/hooks/statement-can';
import { StatementsPanel } from '../statements/components/StatementsPanel';
import { TermsEditor } from '../terms/TermsEditor';
import { TermsView } from '../terms/TermsView';

export type AssistantTab = 'terms' | 'commissions' | 'statements';

export interface AssistantTabBodyProps {
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
