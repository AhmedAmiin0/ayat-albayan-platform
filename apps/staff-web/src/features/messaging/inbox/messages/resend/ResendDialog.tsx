import ar from '@ab/shared/i18n/ar.json';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, FormAlert, Dialog, t } from '@ab/web-kit';
import { sendText } from '@/features/messaging/inbox/api/api';
import { sendErrorText } from '@/features/messaging/inbox/composer/lib/send-error';
import { showAnswer } from '@/features/messaging/inbox/api/send-cache';

/** What goes to the family: always the Arabic text, whatever the UI language (parent-facing output). */
const RESEND_TEXT = ar.inbox.resend.text;

/** The bubble's clientRequestId is reused for every opening, so it sends once (rule 8). */
export function ResendDialog({
  phone,
  clientRequestId,
  onClose,
}: {
  phone: string;
  clientRequestId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const send = useMutation({
    mutationFn: () => sendText({ phone, text: RESEND_TEXT, clientRequestId }),
    onSuccess: (view) => {
      onClose();
      showAnswer(queryClient, view);
    },
  });
  // While it goes, the dialog stays: closing then could lose the answer of a send already on its way.
  const close = () => (send.isPending ? undefined : onClose());
  const actions = (
    <>
      <Button type="button" variant="ghost" onClick={close}>
        {t.common.cancel}
      </Button>
      <Button type="button" disabled={send.isPending || send.isSuccess} onClick={() => send.mutate()}>
        {send.isPending ? t.inbox.resend.sending : t.inbox.resend.send}
      </Button>
    </>
  );
  return (
    <Dialog compact title={t.inbox.resend.title} onClose={close} actions={actions}>
      <div className="grid gap-3">
        <p className="text-sm text-ink-2">{t.inbox.resend.hint}</p>
        <p dir="rtl" data-testid="resend-text" className="rounded-md bg-sunk p-3 text-body">
          {RESEND_TEXT}
        </p>
        {send.isError && <FormAlert>{sendErrorText(send.error)}</FormAlert>}
      </div>
    </Dialog>
  );
}
