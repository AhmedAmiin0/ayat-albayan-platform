import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Ltr } from '@/components/ui/display/ltr';
import { monthLabel } from '@/features/finance/payouts/shared/MonthSelect';
import { Amount } from '@/features/finance/subscriptions/balance/Amount';
import { t } from '@/lib/i18n/i18n';
import type { AssistantStatementView } from '@/features/people/assistants/api';
import { StatementTotals } from './StatementTotals';

const S = t.assistants.statements;

/** What a statement is made of: the salary line, each commission (student) and each adjustment (reason). */
export function StatementLinesDialog({ statement, onClose }: { statement: AssistantStatementView; onClose: () => void }) {
  return (
    <Dialog
      title={S.detailsTitle.replace('{assistant}', statement.assistant.name).replace('{month}', monthLabel(statement.month.slice(0, 7)))}
      onClose={onClose}
      layout="center"
      actions={
        <Button type="button" variant="ghost" onClick={onClose}>
          {t.common.close}
        </Button>
      }
    >
      <ul className="grid gap-2 text-sm">
        {statement.lines.map((line, i) => (
          <li key={`${line.kind}-${i}`} className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
            <span>
              {line.kind === 'salary' && S.lineSalary}
              {line.kind === 'commission' && line.student && (
                <>
                  {(line.commission_kind === 'renewal' ? S.lineCommissionRenewal : S.lineCommission).replace('{student}', line.student.name)}{' '}
                  <Ltr className="text-2xs text-ink-3">{line.student.code}</Ltr>
                </>
              )}
              {line.kind === 'adjustment' && S.lineAdjustment.replace('{reason}', line.reason ?? '')}
            </span>
            <Amount amount={line.amount} currency={line.currency} />
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <StatementTotals totals={statement.totals} />
      </div>
    </Dialog>
  );
}
