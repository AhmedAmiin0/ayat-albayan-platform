import ar from '@ab/shared/i18n/ar.json';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { sendText } from '../../api/api';
import { sendErrorText } from '../../composer/lib/send-error';

/** What goes to the family: always the Arabic text, whatever the UI language (parent-facing output). */
const RESEND_TEXT = ar.inbox.resend.text;

/**
 * «اطلب إعادة الإرسال» confirmed (owner 2026-10-27): the exact text, then «أرسل» through POST
 * /threads/:phone/text. The clientRequestId is the bubble's (ResendAsk), the same for every opening,
 * and the button is off while it goes: a double click, a retry or asking again sends once (the API
 * answers a known id with the first row). The composer's draft is never touched.
 */
export function ResendDialog({ phone, clientRequestId, onClose }: { phone: string; clientRequestId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const send = useMutation({
    mutationFn: () => sendText({ phone, text: RESEND_TEXT, clientRequestId }),
    onSuccess: async () => {
      onClose();
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
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
