import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Toast } from '@/components/ui/overlay/toast';
import { t } from '@/lib/i18n';
import { resetRole, ROLES_KEY, type RoleView } from './api';

const P = t.permissions.page;

export interface RoleResetButtonProps {
  role: RoleView;
  /** The role as the API reset it (the dialog shows its matrix). */
  onReset: (role: RoleView) => void;
  /** The failure to show in the dialog, null when it is cleared. */
  onError: (error: unknown) => void;
}

/**
 * «استعادة الافتراضي» on an editable system role (teacher / sales / assistant): asks first, like
 * «حذف الدور», then POST /roles/:id/reset and the roles list is refreshed.
 */
export function RoleResetButton({ role, onReset, onError }: RoleResetButtonProps) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const reset = useMutation({
    mutationFn: resetRole,
    onMutate: () => onError(null),
    onSuccess: async (view) => {
      await queryClient.invalidateQueries({ queryKey: ROLES_KEY });
      setConfirming(false);
      setDone(true);
      onReset(view);
    },
    onError,
  });
  return (
    <>
      <Button
        type="button"
        variant={confirming ? 'danger' : 'secondary'}
        disabled={reset.isPending}
        onClick={() => (confirming ? reset.mutate(role.id) : setConfirming(true))}
      >
        {confirming ? P.resetConfirm : P.reset}
      </Button>
      {done && <Toast message={P.resetDone} onDismiss={() => setDone(false)} />}
    </>
  );
}
