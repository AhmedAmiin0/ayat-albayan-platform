import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/features/finance/payments';
import { t } from '@ab/web-kit';
import {
  ASSISTANTS_KEY,
  reopenStatement,
  unpayStatement,
  type AssistantStatementView,
} from '@/features/people/assistants/api';
import { PayStatementDialog } from './PayStatementDialog';
import { errorText } from '@/features/people/assistants/status';
import { StatementLinesDialog } from './StatementLinesDialog';

export interface StatementDialog {
  statement: AssistantStatementView;
  kind: 'details' | 'pay' | 'reopen' | 'unpay';
}

/** The dialog behind a statement action: details, pay (receipt), reopen, un-pay (with reason). */
export function StatementDialogs({
  open,
  onClose,
}: {
  open: StatementDialog;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { statement, kind } = open;
  const fix = useMutation({
    mutationFn: (reason: string) =>
      kind === 'unpay'
        ? unpayStatement({ id: statement.id, reason })
        : reopenStatement(statement.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ASSISTANTS_KEY });
      onClose();
    },
  });
  if (kind === 'details') return <StatementLinesDialog statement={statement} onClose={onClose} />;
  if (kind === 'pay') return <PayStatementDialog statement={statement} onClose={onClose} />;
  const S = t.assistants.statements;
  const unpay = kind === 'unpay';
  return (
    <ConfirmDialog
      title={(unpay ? S.unpayTitle : S.reopenTitle).replace(
        '{assistant}',
        statement.assistant.name,
      )}
      confirmLabel={unpay ? t.finance.unpay : t.finance.reopen}
      withReason={unpay}
      pending={fix.isPending}
      error={fix.isError ? errorText(fix.error) : null}
      onConfirm={(reason) => fix.mutate(reason)}
      onClose={onClose}
    >
      <p className="text-sm text-ink-2">{unpay ? S.unpayBody : S.reopenBody}</p>
    </ConfirmDialog>
  );
}
