import ar from '@ab/shared/i18n/ar.json';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
 * /threads/:phone/text. One clientRequestId per opened dialog and the button off while it goes, so a
 * double click or a retry after a lost answer sends once. The composer's draft is never touched.
 */
export function ResendDialog({ phone, onClose }: { phone: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [clientRequestId] = useState(() => crypto.randomUUID());
  const send = useMutation({
    mutationFn: () => sendText({ phone, text: RESEND_TEXT, clientRequestId }),
    onSuccess: async () => {
      onClose();
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
  const actions = (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="button" disabled={send.isPending || send.isSuccess} onClick={() => send.mutate()}>
        {send.isPending ? t.inbox.resend.sending : t.inbox.resend.send}
      </Button>
    </>
  );
  return (
    <Dialog compact title={t.inbox.resend.title} onClose={onClose} actions={actions}>
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
