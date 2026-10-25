import { useEffect, useRef, useState } from 'react';
import { requestId } from '@/core/lib/http/request-id';
import { useChatActions } from './chat-actions';
import { sendError } from './message-text';
import { quoteOf } from './quote-text';
import { useSendStagedFile } from './saved-replies/send-staged';
import type { StagedFile } from './saved-replies/use-saved-reply';
import { fileError } from './send-file';
import { type Outgoing, useSendMessage } from './use-thread';

/** One template draft = one key + params: re-sending it after an error keeps its clientRequestId. */
const draftOf = (out: Outgoing): string =>
  out.kind === 'template' ? JSON.stringify([out.key, out.params, out.lessonId]) : '';

export interface ComposerSendInput {
  phone: string;
  text: string;
  setText: (next: string | ((now: string) => string)) => void;
  /** A picked saved reply's file: sent after the text, through the chat's own file send. */
  staged: StagedFile | null;
  clearStaged: () => void;
}

/**
 * The box's «أرسل»: the text (its clientRequestId kept while the same text is retried, so a lost
 * answer never sends twice), then a staged file. A refused text comes back into the box; the file
 * waits in its chip until it went. A template keeps its own id the same way. `errors` = what failed, in words.
 */
export function useComposerSend({ phone, text, setText, staged, clearStaged }: ComposerSendInput) {
  const send = useSendMessage(phone);
  const sendStaged = useSendStagedFile(phone);
  const [draftId, setDraftId] = useState(requestId);
  // «رد» (owner 2026-10-25): the message the next text answers; another target is another send.
  const { reply, setReply } = useChatActions();
  const draftReply = useRef<string | undefined>(undefined);
  // The same for a template: the same template + params sent again (after «جرّب تاني») reuses its id.
  const templateDraft = useRef<{ draft: string; id: string } | null>(null);
  const sendTemplate = (out: Outgoing) => {
    const draft = draftOf(out);
    const last = templateDraft.current;
    const id = last?.draft === draft ? last.id : requestId();
    templateDraft.current = { draft, id };
    send.mutate({ out, id }, { onSuccess: () => (templateDraft.current = null) });
  };
  // The chip as it is now, not as it was at the tap: removed or replaced meanwhile → not this file.
  const stagedNow = useRef(staged);
  useEffect(() => {
    stagedNow.current = staged;
  }, [staged]);
  const sendFile = (file: StagedFile | null) => {
    if (!file) return;
    const still = () => stagedNow.current?.requestId === file.requestId;
    sendStaged.mutate(file, { onSuccess: () => still() && clearStaged() });
  };
  const sendText = () => {
    if (send.isPending || sendStaged.isPending) return;
    const body = text.trim();
    const tapped = staged?.requestId;
    if (!body) return sendFile(staged);
    setText('');
    const replyTo = reply ? quoteOf(reply) : undefined;
    const id = draftReply.current === replyTo?.id ? draftId : requestId();
    draftReply.current = replyTo?.id;
    setDraftId(id);
    send.mutate(
      { out: { kind: 'text', text: body, ...(replyTo ? { replyTo } : {}) }, id },
      {
        onSuccess: () => {
          setDraftId(requestId());
          if (replyTo) setReply((now) => (now?.id === replyTo.id ? null : now));
          const now = stagedNow.current;
          if (now && now.requestId === tapped) sendFile(now);
        },
        onError: () => setText((now) => now || body),
      },
    );
  };
  const errors = [send.isError ? sendError(send.error) : null, sendStaged.isError ? fileError(sendStaged.error) : null];
  return { sendTemplate, sendText, renew: () => setDraftId(requestId()), errors, pending: send.isPending || sendStaged.isPending };
}

/** The failures under the box: the text's always; the file's only while the window is open. */
export function errorLines(input: { errors: (string | null)[]; fileError: string | null; open: boolean }): string[] {
  const [text, staged] = input.errors;
  const lines = input.open ? [text, input.fileError, staged] : [text];
  return lines.filter((l): l is string => !!l);
}
