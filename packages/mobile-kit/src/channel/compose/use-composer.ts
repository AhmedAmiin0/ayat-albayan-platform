import { CHANNEL_BODY_MAX } from '@ab/shared';
import { useState } from 'react';
import { t } from '../../lib/i18n/i18n';
import type { ChannelRef } from '../channel-api';
import { newClientId } from '../send/client-id';
import { sendErrorText } from '../send/channel-post';
import { remainingDraft, sendIdFor, type SendAttempt } from '../send/draft';
import { useSendText } from '../send/use-channel-send';

export interface ComposerReply {
  /** The message being answered, or null. */
  id: string | null;
  /** Sent: the quote bar closes. */
  done: () => void;
}

const overText = (tooLong: boolean): string | null =>
  tooLong ? t.studentChannel.tooLong.replace('{n}', String(CHANNEL_BODY_MAX)) : null;

/**
 * The text box's state (docs/31 §2): up to CHANNEL_BODY_MAX characters (the API trims and checks
 * again). Every send carries a client_id and a retry of the same text reuses it; once the API has
 * it only the sent words leave the box, so what she typed meanwhile stays.
 */
export function useComposer(ref: ChannelRef, reply: ComposerReply) {
  const send = useSendText(ref);
  const [text, setText] = useState('');
  const [attempt, setAttempt] = useState<SendAttempt | null>(null);
  const body = text.trim();
  const tooLong = body.length > CHANNEL_BODY_MAX;
  const submit = () => {
    if (!body || tooLong || send.isPending) return;
    const sent = text;
    const clientId = sendIdFor(attempt, body, newClientId);
    setAttempt({ body, clientId });
    const onSuccess = () => {
      setText((current) => remainingDraft(current, sent));
      setAttempt(null);
      reply.done();
    };
    send.mutate({ body, clientId, replyToId: reply.id ?? undefined }, { onSuccess });
  };
  return {
    text,
    setText,
    submit,
    hasText: body !== '',
    canSend: body !== '' && !tooLong && !send.isPending,
    note: send.isError ? sendErrorText(send.error) : overText(tooLong),
  };
}
