import { useIsMutating } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { requestId } from '@/core/lib/http/request-id';
import { chatSendError } from '@/inbox/thread/send/send-error';
import { targetKey, useTextTarget } from '@/inbox/composer/edit/text-target';
import { useSendStagedFile } from '@/inbox/saved-replies/hooks/send-staged';
import type { StagedFile } from '@/inbox/saved-replies/hooks/use-saved-reply';
import { fileError } from './send-file';
import { type Outgoing, sendKey, useSendMessage } from '@/inbox/thread/hooks/use-thread';
import { useBoxId } from '@/inbox/thread/send/box-id';
import { PINS, useReplayed } from '@/inbox/thread/send/pinned-send';
import { t } from '@/core/lib/i18n/i18n';

/** One template draft = one key + params: re-sending it after an error keeps its clientRequestId. */
const draftOf = (out: Outgoing): string =>
  out.kind === 'template' ? JSON.stringify([out.key, out.params, out.lessonId]) : '';

/**
 * A template's clientRequestId: the same template + params sent again (after «جرّب تاني») reuses
 * its id, so a lost answer never sends twice; `sent` forgets it once the API took the row.
 */
export function useTemplateId() {
  const last = useRef<{ draft: string; id: string } | null>(null);
  const of = (out: Outgoing): string => {
    const draft = draftOf(out);
    const id = last.current?.draft === draft ? last.current.id : requestId();
    last.current = { draft, id };
    return id;
  };
  const sent = () => {
    last.current = null;
  };
  return { of, sent };
}

interface ComposerSendInput {
  phone: string;
  text: string;
  setText: (next: string | ((now: string) => string)) => void;
  /** A picked saved reply's file: sent after the text, through the chat's own file send. */
  staged: StagedFile | null;
  clearStaged: () => void;
}

/**
 * The box's «أرسل»: the text (its clientRequestId from useBoxId: a lost answer never sends twice),
 * then a staged file. A refused text comes back into the box; the file
 * waits in its chip until it went. A template keeps its own id the same way. `errors` = what failed, in words.
 */
export function useComposerSend({ phone, text, setText, staged, clearStaged }: ComposerSendInput) {
  const send = useSendMessage(phone);
  // Any send of this chat in flight (this box's or «عرض سعر»'s): one at a time.
  const inFlight = useIsMutating({ mutationKey: sendKey(phone) }) > 0;
  const sendStaged = useSendStagedFile(phone);
  const boxId = useBoxId(phone);
  const replayed = useReplayed('box', phone);
  // «رد» (owner 2026-10-25) or «تعديل» (2026-11-07): what the next text answers or corrects.
  const target = useTextTarget();
  const templateId = useTemplateId();
  const sendTemplate = (out: Outgoing) => {
    send.mutate({ out, id: templateId.of(out) }, { onSuccess: templateId.sent });
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
    if (inFlight || send.isPending || sendStaged.isPending) return;
    const body = text.trim();
    const tapped = staged?.requestId;
    if (target.bare(body)) return sendFile(staged);
    setText('');
    const out = target.out(body);
    const id = boxId.take(body, targetKey(out));
    // Hook-level (useSendMessage) puts the text back after no answer or a refusal, pins or
    // releases the id, and on a replay of the first message brings the edit back (docs/44 M1).
    send.mutate(
      { out, id, pin: 'box' },
      {
        onSuccess: () => {
          boxId.sent();
          if (PINS.box.replayed(phone)) return;
          target.sent(out);
          const now = stagedNow.current;
          if (now && now.requestId === tapped) sendFile(now);
        },
      },
    );
  };
  const sendLine = send.isError ? chatSendError(send.error) : null;
  const textLine = replayed ? t.inbox.error.send_replayed : sendLine;
  const errors = [textLine, sendStaged.isError ? fileError(sendStaged.error) : null];
  const pending = inFlight || send.isPending || sendStaged.isPending;
  // In edit mode a box holding only «تصحيح:» has nothing to send (round 3 of #694), nor one with no
  // room left for the prefix (round 4).
  return { sendTemplate, sendText, renew: boxId.renew, errors, pending, blocked: target.blocked(text) };
}

/** The failures under the box: the text's always; the file's only while the window is open. */
export function errorLines(input: { errors: (string | null)[]; fileError: string | null; open: boolean }): string[] {
  const [text, staged] = input.errors;
  const lines = input.open ? [text, input.fileError, staged] : [text];
  return lines.filter((l): l is string => !!l);
}
