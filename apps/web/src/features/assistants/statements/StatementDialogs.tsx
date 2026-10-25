import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/features/payments/ConfirmDialog';
import { t } from '@/lib/i18n/i18n';
import { ASSISTANTS_KEY, reopenStatement, unpayStatement, type AssistantStatementView } from '../api';
import { PayStatementDialog } from './PayStatementDialog';
import { errorText } from '../status';
import { StatementLinesDialog } from './StatementLinesDialog';

export type StatementDialog = { statement: AssistantStatementView; kind: 'details' | 'pay' | 'reopen' | 'unpay' };

/** The dialog behind a statement row action: details, pay (receipt), reopen, un-pay (with a reason). */
export function StatementDialogs({ open, onClose }: { open: StatementDialog; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { statement, kind } = open;
  const fix = useMutation({
    mutationFn: (reason: string) => (kind === 'unpay' ? unpayStatement({ id: statement.id, reason }) : reopenStatement(statement.id)),
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
      title={(unpay ? S.unpayTitle : S.reopenTitle).replace('{assistant}', statement.assistant.name)}
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
