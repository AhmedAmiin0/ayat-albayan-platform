import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/features/payments/record/ConfirmDialog';
import { moneyText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n/i18n';
import { ASSISTANTS_KEY, voidCommission, type AssistantCommissionView } from '../api';
import { errorText } from '../status';

type Props = { commission: AssistantCommissionView; onClose: () => void };

/** Voiding asks for a reason (audited); the money side effects are the database's (a reversal in a frozen statement). */
export function VoidCommissionDialog({ commission, onClose }: Props) {
  const queryClient = useQueryClient();
  const run = useMutation({
    mutationFn: voidCommission,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ASSISTANTS_KEY });
      onClose();
    },
  });
  return (
    <ConfirmDialog
      title={t.assistants.ledger.voidTitle.replace('{student}', commission.student.name)}
      confirmLabel={t.assistants.ledger.void}
      withReason
      pending={run.isPending}
      error={run.isError ? errorText(run.error) : null}
      onConfirm={(reason) => run.mutate({ id: commission.id, reason })}
      onClose={onClose}
    >
      <p className="text-sm text-ink-2">{t.assistants.ledger.voidBody.replace('{amount}', moneyText(commission.amount, commission.currency))}</p>
    </ConfirmDialog>
  );
}
