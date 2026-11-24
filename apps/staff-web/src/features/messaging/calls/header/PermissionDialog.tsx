import { permissionHint, permissionReplyText, type PermissionAsk } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { useClock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { fullTime } from '@/features/messaging/inbox';
import { callErrorText } from '@/features/messaging/calls/api/call-error';
import { callApi } from '@/features/messaging/calls/api/calls-api';

export interface PermissionDialogProps {
  ask: PermissionAsk;
  onClose: () => void;
  onSent: () => void;
}

/** Nothing is sent until pressed (docs/28 §3.1); outside the window only an approved template. */
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
  const reply = permissionReplyText(sheet.reply, {
    text: t.calls.permission,
    at: (iso) => fullTime(iso, clock),
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
