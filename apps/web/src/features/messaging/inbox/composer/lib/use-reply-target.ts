import { useEffect, useState, type RefObject } from 'react';
import { useChatActions } from '@/features/messaging/inbox/shared/chat-actions';

/**
 * The composer's side of «رد»: the id its next send answers (undefined when none), and the focus on
 * its box whenever a new target is picked. `done(id)` after a send clears that target only (a newer
 * one picked meanwhile stays); a failed send keeps it.
 */
export function useReplyTarget(box: RefObject<HTMLElement | null>) {
  const { target, cancelReply } = useChatActions();
  const id = target?.id;
  useEffect(() => {
    if (id) box.current?.focus();
  }, [id, box]);
  return { replyTo: id, done: cancelReply };
}

/**
 * The composer's side of «تعديل» (owner 2026-11-07): the id its next send corrects, and the focus
 * on its box (the caret after the original's text) whenever one is picked. `done(id)` as «رد».
 */
export function useEditTarget(box: RefObject<HTMLTextAreaElement | null>) {
  const { editing, cancelEdit } = useChatActions();
  const id = editing?.id;
  useEffect(() => {
    const el = box.current;
    if (!id || !el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [id, box]);
  return { correctsId: id, done: cancelEdit };
}

/** Calls `toText` (render phase) when a new target is picked: the template toggle gives way to the box. */
export function useTextOnReply(toText: () => void): void {
  const { target, editing } = useChatActions();
  const id = target?.id ?? editing?.id;
  const [seen, setSeen] = useState(id);
  if (id === seen) return;
  setSeen(id);
  if (id) toText();
}
