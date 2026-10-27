import { permissionHint } from '@ab/client-core';
import type { CallPermissionState } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { callErrorText } from '../api/call-error';
import { callApi } from '../api/calls-api';

export interface PermissionDialogProps {
  phone: string;
  state: Exclude<CallPermissionState, 'granted'>;
  onClose: () => void;
  /** The request went out (the bubble shows in the chat): the provider shows «أُرسل طلب الإذن». */
  onSent: () => void;
}

/**
 * No permission to call this number yet (docs/28 §3.1): inside the 24 h window «اطلب إذن الاتصال»
 * sends WhatsApp's own permission request through the outbox; otherwise the dialog says why not.
 */
export function PermissionDialog({ phone, state, onClose, onSent }: PermissionDialogProps) {
  const client = useQueryClient();
  const ask = useMutation({
    mutationFn: () => callApi.requestCallPermission(phone),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['threads', 'detail', phone] });
      onSent();
    },
  });
  const actions = (
    <>
      <Button variant="ghost" onClick={onClose}>
        {t.common.close}
      </Button>
      {state === 'request' && (
        <Button disabled={ask.isPending} onClick={() => ask.mutate()}>
          {t.calls.permission.request}
        </Button>
      )}
    </>
  );
  return (
    <Dialog compact title={t.calls.permission.title} onClose={onClose} actions={actions}>
      <p className="text-sm text-ink-2">{permissionHint(state, t.calls.permission)}</p>
      {ask.isError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {callErrorText(ask.error)}
        </p>
      )}
    </Dialog>
  );
}
