import { useEffect, useState, type RefObject } from 'react';
import { useChatActions } from '@/features/messaging/inbox/shared/chat-actions';

/** `done(id)` clears only that target, so a newer one stays; a failed send keeps it. */
export function useReplyTarget(box: RefObject<HTMLElement | null>) {
  const { target, cancelReply } = useChatActions();
  const id = target?.id;
  useEffect(() => {
    if (id) box.current?.focus();
  }, [id, box]);
  return { replyTo: id, done: cancelReply };
}

/** `done(session)` ends that very edit only. */
export function useEditTarget(box: RefObject<HTMLTextAreaElement | null>) {
  const { editing, editSession, cancelEdit } = useChatActions();
  const id = editing?.id;
  useEffect(() => {
    const el = box.current;
    if (!id || !el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [id, box]);
  return { correctsId: id, session: editSession ?? undefined, done: cancelEdit };
}

/** Calls `toText` (render phase) when a new target is picked: the template toggle gives way. */
export function useTextOnReply(toText: () => void): void {
  const { target, editing } = useChatActions();
  const id = target?.id ?? editing?.id;
  const [seen, setSeen] = useState(id);
  if (id === seen) return;
  setSeen(id);
  if (id) toText();
}
