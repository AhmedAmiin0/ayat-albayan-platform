import type { AssistantStatementView } from '@ab/shared';
import { useMemo } from 'react';
import { usePermissions } from '@/auth/use-permissions';

export type StatementAction = 'details' | 'approve' | 'pay' | 'reopen' | 'unpay' | 'receipt';
export type StatementCan = { read: boolean; write: boolean; approve: boolean };

/** What this admin may do here (web use-statement-can): read, write (terms, void, generate, pay), approve. */
export function useStatementCan(): StatementCan {
  const can = usePermissions();
  const [read, write, approve] = [can('assistantpay.read'), can('assistantpay.write'), can('assistantpay.approve')];
  return useMemo(() => ({ read, write, approve }), [read, write, approve]);
}

/**
 * The web's StatementActions, in its order: draft → «اعتماد»; approved → «دُفعت» / «إعادة فتح»;
 * paid → «الإيصال» / «إلغاء الدفع». Always «التفاصيل». Approving, reopening and un-paying are the
 * approver's (assistantpay.approve, as the API); paying is the writer's.
 */
export function statementActions(s: Pick<AssistantStatementView, 'status' | 'has_receipt'>, can: Pick<StatementCan, 'write' | 'approve'>): StatementAction[] {
  const actions: StatementAction[] = ['details'];
  if (s.status === 'draft' && can.approve) actions.unshift('approve');
  if (s.status === 'approved') {
    const own: StatementAction[] = [];
    if (can.write) own.push('pay');
    if (can.approve) own.push('reopen');
    actions.unshift(...own);
  }
  if (s.status === 'paid') {
    if (s.has_receipt) actions.unshift('receipt');
    if (can.approve) actions.push('unpay');
  }
  return actions;
}
