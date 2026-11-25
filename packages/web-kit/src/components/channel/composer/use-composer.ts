import { insertAt, remainingDraft, type ChannelFileToSend } from '@ab/client-core';
import { CHANNEL_BODY_MAX, type ChannelMessageView } from '@ab/shared';
import { useState, type KeyboardEvent } from 'react';
import type { ChannelRef } from '@ab/web-kit/components/channel/api';
import type { TextSend } from '@ab/web-kit/components/channel/thread/use-channel-send';
import { useChannelDraft } from './use-channel-draft';
import { canRecord, useRecorder } from './use-recorder';
import { useSendFile } from './use-send-file';

export interface ComposerInput {
  refs: ChannelRef;
  /** The chat's draft key (draftKey): the unsent text survives closing the panel. */
  draft: string;
  send: { send: (text: TextSend) => Promise<unknown>; pending: boolean; problem: string | null };
  /** The message being answered (the reply bar), and how to drop it once sent or cancelled. */
  reply: { to: ChannelMessageView | null; cancel: () => void };
}

export type Panel = 'none' | 'emoji' | 'attach';
export type Round = 'mic' | 'send' | 'voice';

const ignore = () => undefined;

/** Esc inside a composer panel: closes it only, never the panel or dialog around the chat. */
export const escapeCloses = (onClose: () => void) => (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  e.stopPropagation();
  onClose();
};

function roundOf(recording: boolean, typed: boolean): Round {
  if (recording) return 'voice';
  return typed || !canRecord() ? 'send' : 'mic';
}

/**
 * The composer's state: the text (kept per chat), the emoji and attach panels, a file or a voice
 * note sent with the quoted message, and the text sent with it; only the text that went out
 * leaves the box, and the reply bar closes once the message is stored.
 */
export function useComposer({ refs, draft, send, reply }: ComposerInput) {
  const [text, setText] = useChannelDraft(draft);
  const [panel, setPanel] = useState<Panel>('none');
  const files = useSendFile(refs);
  const mic = useRecorder();
  const body = text.trim();
  const tooLong = body.length > CHANNEL_BODY_MAX;
  const replyToId = reply.to?.id;
  const sendText = () => {
    if (!body || tooLong || send.pending) return;
    const sent = text;
    void send.send({ body, replyToId }).then(() => {
      setText((current) => remainingDraft({ current, sent }));
      reply.cancel();
    }, ignore);
  };
  const sendFile = (file: ChannelFileToSend) => {
    setPanel('none');
    void files.send({ file, replyToId }).then(reply.cancel, ignore);
  };
  /** An emoji at the box's caret (or over its selection); the caret then sits after it. */
  const addEmoji = (emoji: string, el: HTMLTextAreaElement | null) => {
    const at = el ? { start: el.selectionStart, end: el.selectionEnd } : { start: 0, end: 0 };
    const next = insertAt(text, at, emoji);
    setText(next.text);
    requestAnimationFrame(() => el?.setSelectionRange(next.caret, next.caret));
  };
  const finishVoice = () => void mic.stop().then((note) => note && sendFile(note));
  return {
    ...{ text, setText, panel, setPanel, tooLong, sendText, sendFile, addEmoji },
    ...{ files, mic, finishVoice, round: roundOf(mic.state === 'recording', body !== '') },
  };
}
