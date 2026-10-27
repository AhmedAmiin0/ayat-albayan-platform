import { CHANNEL_BODY_MAX } from '@ab/shared';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';

interface Props {
  pending: boolean;
  failed: boolean;
  /** Resolves once the message is stored; the text is cleared then. */
  onSend: (body: string) => Promise<unknown>;
}

/** Text only, up to CHANNEL_BODY_MAX characters (the API trims and checks again). */
export function ChannelComposer({ pending, failed, onSend }: Props) {
  const [text, setText] = useState('');
  const body = text.trim();
  const tooLong = body.length > CHANNEL_BODY_MAX;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!body || tooLong || pending) return;
    void onSend(body).then(() => setText(''), () => undefined);
  };
  return (
    <form onSubmit={submit} className="grid gap-2 border-t border-rule pt-3">
      {failed && <FormAlert>{t.studentChannel.sendFailed}</FormAlert>}
      {tooLong && <FormAlert>{t.studentChannel.tooLong.replace('{n}', String(CHANNEL_BODY_MAX))}</FormAlert>}
      <textarea
        aria-label={t.studentChannel.messageLabel}
        dir="auto"
        rows={2}
        value={text}
        placeholder={t.studentChannel.placeholder}
        onChange={(e) => setText(e.target.value)}
        className="min-h-11 w-full resize-y rounded-md border border-input bg-raised px-3 py-2 text-body"
      />
      <Button type="submit" disabled={!body || tooLong || pending} className="justify-self-end">
        {pending ? t.studentChannel.sending : t.studentChannel.send}
      </Button>
    </form>
  );
}
