import { useEffect, useState, type RefObject } from 'react';
import { useChatActions } from '../../shared/chat-actions';

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

/** Calls `toText` (render phase) when a new target is picked: the template toggle gives way to the box. */
export function useTextOnReply(toText: () => void): void {
  const id = useChatActions().target?.id;
  const [seen, setSeen] = useState(id);
  if (id === seen) return;
  setSeen(id);
  if (id) toText();
}
