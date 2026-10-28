import { permissionHint, permissionReplyText, type PermissionAsk } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { fullTime } from '../../format';
import { callErrorText } from '../api/call-error';
import { callApi } from '../api/calls-api';

export interface PermissionDialogProps {
  ask: PermissionAsk;
  onClose: () => void;
  /** The request went out (the bubble shows in the chat): the provider shows «أُرسل طلب الإذن». */
  onSent: () => void;
}

/**
 * No permission to call this number yet (docs/28 §3.1): inside the 24 h window «اطلب إذن الاتصال»
 * sends WhatsApp's own permission request; from a calls number (§10) outside its window, the approved
 * template of the settings (or, unset, the button is not offered and the sheet says why). The family's
 * last answer on the calls number shows under it. Nothing is sent until the button is pressed.
 */
export function PermissionDialog({ ask: sheet, onClose, onSent }: PermissionDialogProps) {
  const client = useQueryClient();
  const clock = useClock();
  const { phone, state } = sheet;
  const ask = useMutation({
    mutationFn: () => callApi.requestCallPermission(phone),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['threads', 'detail', phone] });
      onSent();
    },
  });
  const reply = permissionReplyText(sheet.reply, { text: t.calls.permission, at: (iso) => fullTime(iso, clock) });
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
      <p className="text-sm text-ink-2">{permissionHint(sheet, t.calls.permission)}</p>
      {reply && <p className="mt-2 text-sm text-ink-3">{reply}</p>}
      {ask.isError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {callErrorText(ask.error)}
        </p>
      )}
    </Dialog>
  );
}
