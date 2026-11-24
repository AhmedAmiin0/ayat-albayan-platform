import type { PayoutStatus } from '@ab/catalog';
import type { AssistantStatementView } from '@ab/money';

// Statement buttons per status (docs/36 f6); approve, reopen and unpay need assistantpay.approve.

export type StatementAction = 'details' | 'approve' | 'pay' | 'reopen' | 'unpay' | 'receipt';
export interface StatementCan {
  write: boolean;
  approve: boolean;
}

interface Facts extends StatementCan {
  receipt: boolean;
}
type Rule = readonly [StatementAction, (facts: Facts) => boolean];

const always = (): boolean => true;
const approver = (f: Facts): boolean => f.approve;
const writer = (f: Facts): boolean => f.write;
const hasReceipt = (f: Facts): boolean => f.receipt;

const STATEMENT_ACTIONS = {
  draft: [['approve', approver], ['details', always]],
  approved: [['pay', writer], ['reopen', approver], ['details', always]],
  paid: [['receipt', hasReceipt], ['details', always], ['unpay', approver]],
} as const satisfies Record<PayoutStatus, readonly Rule[]>;

/** The actions a statement offers this admin, in display order. */
export function statementActions(
  s: Pick<AssistantStatementView, 'status' | 'has_receipt'>,
  can: StatementCan,
): StatementAction[] {
  const facts: Facts = { write: can.write, approve: can.approve, receipt: s.has_receipt };
  const rules: readonly Rule[] = STATEMENT_ACTIONS[s.status];
  return rules.filter(([, allowed]) => allowed(facts)).map(([action]) => action);
}
