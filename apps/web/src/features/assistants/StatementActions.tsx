import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import type { AssistantStatementView } from './api';

export type StatementAction = 'details' | 'approve' | 'pay' | 'reopen' | 'unpay' | 'receipt';
export type StatementCan = { write: boolean; approve: boolean };
type Props = { statement: AssistantStatementView; can: StatementCan; onAction: (action: StatementAction) => void };

/** draft → «اعتماد»; approved → «دُفعت» / «إعادة فتح»; paid → «الإيصال» / «إلغاء الدفع». Always «التفاصيل». */
export function StatementActions({ statement, can, onAction }: Props) {
  const btn = (action: StatementAction, label: string, variant: 'secondary' | 'ghost' = 'secondary') => (
    <Button key={action} type="button" variant={variant} size="sm" onClick={() => onAction(action)}>
      {label}
    </Button>
  );
  const { status } = statement;
  const buttons = [btn('details', t.assistants.statements.details, 'ghost')];
  if (status === 'draft' && can.approve) buttons.unshift(btn('approve', t.payouts.approve));
  if (status === 'approved' && can.write) buttons.unshift(btn('pay', t.payouts.markPaid), btn('reopen', t.finance.reopen, 'ghost'));
  if (status === 'paid') {
    if (statement.has_receipt) buttons.unshift(btn('receipt', t.earnings.viewReceipt));
    if (can.write) buttons.push(btn('unpay', t.finance.unpay, 'ghost'));
  }
  return <div className="flex flex-wrap gap-1.5">{buttons}</div>;
}
