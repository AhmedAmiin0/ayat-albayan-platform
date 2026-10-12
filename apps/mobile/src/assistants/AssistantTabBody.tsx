import type { AssistantRow } from './api';
import { CommissionLedger } from './CommissionLedger';
import type { StatementCan } from './statement-can';
import { StatementsPanel } from './StatementsPanel';
import { TermsEditor } from './TermsEditor';
import { TermsView } from './TermsView';

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
