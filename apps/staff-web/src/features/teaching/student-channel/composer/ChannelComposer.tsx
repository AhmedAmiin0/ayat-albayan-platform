import { remainingDraft } from '@ab/client-core';
import { CHANNEL_BODY_MAX } from '@ab/shared';
import type { KeyboardEvent, SubmitEvent } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useChannelDraft } from './use-channel-draft';

interface Props {
  /**
   * The chat's draft key (draftKey): the unsent text survives closing the panel. The thread keys
   * the composer by it too, so switching the student never carries one chat's text to another.
   */
  draft: string;
  pending: boolean;
  failed: boolean;
  /** Resolves once the message is stored; only the text that was sent is cleared then. */
  onSend: (body: string) => Promise<unknown>;
}

/**
 * Esc in the box only leaves the box (never closes the panel around the chat): a second Esc
 * does.
 */
const leaveBox = (e: KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key !== 'Escape') return;
  e.stopPropagation();
  e.currentTarget.blur();
};

/** Text only, up to CHANNEL_BODY_MAX characters (the API trims and checks again). */
export function ChannelComposer({ draft, pending, failed, onSend }: Props) {
  const [text, setText] = useChannelDraft(draft);
  const body = text.trim();
  const tooLong = body.length > CHANNEL_BODY_MAX;
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!body || tooLong || pending) return;
    const sent = text;
    void onSend(body).then(
      () => setText((current) => remainingDraft({ current, sent })),
      () => undefined,
    );
  };
  return (
    <form onSubmit={submit} className="grid gap-2 border-t border-rule pt-3">
      {failed && <FormAlert>{t.studentChannel.sendFailed}</FormAlert>}
      {tooLong && (
        <FormAlert>{t.studentChannel.tooLong.replace('{n}', String(CHANNEL_BODY_MAX))}</FormAlert>
      )}
      <textarea
        aria-label={t.studentChannel.messageLabel}
        dir="auto"
        rows={2}
        value={text}
        placeholder={t.studentChannel.placeholder}
        onKeyDown={leaveBox}
        onChange={(e) => setText(e.target.value)}
        className="min-h-11 w-full resize-y rounded-md border border-input bg-raised px-3 py-2 text-body"
      />
      <Button type="submit" disabled={!body || tooLong || pending} className="justify-self-end">
        {pending ? t.studentChannel.sending : t.studentChannel.send}
      </Button>
    </form>
  );
}
