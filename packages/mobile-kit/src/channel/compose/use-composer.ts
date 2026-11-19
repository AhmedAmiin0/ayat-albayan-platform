import { insertAt, remainingDraft, sendIdFor, type SendAttempt } from '@ab/client-core';
import { CHANNEL_BODY_MAX } from '@ab/shared';
import { useState } from 'react';
import { t } from '../../lib/i18n/i18n';
import type { ChannelRef } from '../channel-api';
import { sendErrorText } from '../send/channel-post';
import { useSendText } from '../send/use-channel-send';

export interface ComposerReply {
  /** The message being answered, or null. */
  id: string | null;
  /** Sent: the quote bar closes. */
  done: () => void;
}

interface Selection {
  start: number;
  end: number;
}

const overText = (tooLong: boolean): string | null =>
  tooLong ? t.studentChannel.tooLong.replace('{n}', String(CHANNEL_BODY_MAX)) : null;

/**
 * The text box's state (docs/31 §2): up to CHANNEL_BODY_MAX characters (the API trims and checks
 * again). Every send carries a client_id and a retry of the same text reuses it; once the API has
 * it only the sent words leave the box, so what she typed meanwhile stays. An emoji goes in at the
 * caret.
 */
export function useComposer(ref: ChannelRef, reply: ComposerReply) {
  const send = useSendText(ref);
  const [text, setText] = useState('');
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [attempt, setAttempt] = useState<SendAttempt | null>(null);
  const body = text.trim();
  const tooLong = body.length > CHANNEL_BODY_MAX;
  const submit = () => {
    if (!body || tooLong || send.isPending) return;
    const sent = text;
    const clientId = sendIdFor(attempt, body);
    setAttempt({ body, clientId });
    const onSuccess = () => {
      setText((current) => remainingDraft({ current, sent }));
      setAttempt(null);
      reply.done();
    };
    send.mutate({ body, clientId, replyToId: reply.id ?? undefined }, { onSuccess });
  };
  const insert = (emoji: string) => {
    const next = insertAt(text, selection, emoji);
    setText(next.text);
    setSelection({ start: next.caret, end: next.caret });
  };
  return {
    text,
    setText,
    selection,
    setSelection,
    insert,
    submit,
    hasText: body !== '',
    canSend: body !== '' && !tooLong && !send.isPending,
    note: send.isError ? sendErrorText(send.error) : overText(tooLong),
  };
}
