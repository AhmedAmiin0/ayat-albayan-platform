import { statementActions, type StatementAction, type StatementCan } from '@ab/client-core';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import type { AssistantStatementView } from '@/features/people/assistants/api';

export type { StatementAction, StatementCan };
type Props = { statement: AssistantStatementView; can: StatementCan; onAction: (action: StatementAction) => void };
type Look = { label: () => string; variant: 'secondary' | 'ghost' };

const LOOK = {
  details: { label: () => t.assistants.statements.details, variant: 'ghost' },
  approve: { label: () => t.payouts.approve, variant: 'secondary' },
  pay: { label: () => t.payouts.markPaid, variant: 'secondary' },
  reopen: { label: () => t.finance.reopen, variant: 'ghost' },
  unpay: { label: () => t.finance.unpay, variant: 'ghost' },
  receipt: { label: () => t.earnings.viewReceipt, variant: 'secondary' },
} as const satisfies Record<StatementAction, Look>;

/** One button per allowed action, in the shared order (statementActions in @ab/client-core). */
export function StatementActions({ statement, can, onAction }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {statementActions(statement, can).map((action) => (
        <Button key={action} type="button" variant={LOOK[action].variant} size="sm" onClick={() => onAction(action)}>
          {LOOK[action].label()}
        </Button>
      ))}
    </div>
  );
}
