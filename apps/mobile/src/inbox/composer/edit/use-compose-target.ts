import type { MessageView } from '@ab/shared';
import { type Dispatch, type RefObject, type SetStateAction, useEffect, useRef, useState } from 'react';
import { getComposerText, setComposerText } from '@/inbox/composer/draft-store';

/** What the box's next text answers («رد») or corrects («تعديل»): one of them at most. */
interface ComposeTarget {
  reply: MessageView | null;
  setReply: Dispatch<SetStateAction<MessageView | null>>;
  editing: MessageView | null;
  startEdit: (m: MessageView) => void;
  cancelEdit: () => void;
  editSent: (id: string) => void;
}

/** The box's own draft from before «تعديل», and the message being corrected. */
type Saved = { id: string; text: string } | null;

/** An edit that ends without a send: the box's own draft comes back. */
function restore(phone: string, saved: RefObject<Saved>): void {
  const was = saved.current;
  saved.current = null;
  if (was) setComposerText(phone, was.text);
}

/** Leaving the chat (another chat, the screen closed) mid-edit ends it as ✕ does. */
function useRestoreOnLeave(phone: string, saved: RefObject<Saved>): void {
  useEffect(() => () => restore(phone, saved), [phone, saved]);
}

/**
 * One open chat's «رد» and «تعديل» (owner 2026-11-07), as WhatsApp: picking a reply ends an edit,
 * starting an edit drops the reply and puts the original's text in the box. An edit keeps the
 * box's draft from before it: ✕, a picked reply or leaving the chat brings it back (review of
 * #694); only its sent correction drops it. An updater (a send that settles its own reply) never
 * ends an edit.
 */
export function useComposeTarget(phone: string): ComposeTarget {
  const [reply, setReplyNow] = useState<MessageView | null>(null);
  // Per chat: a screen that stays mounted on another chat is never in edit mode there.
  const [edit, setEdit] = useState<{ phone: string; m: MessageView } | null>(null);
  const editing = edit?.phone === phone ? edit.m : null;
  const saved = useRef<Saved>(null);
  useRestoreOnLeave(phone, saved);
  const cancelEdit = () => {
    setEdit(null);
    restore(phone, saved);
  };
  const setReply: Dispatch<SetStateAction<MessageView | null>> = (next) => {
    const picked = typeof next !== 'function' && next !== null;
    if (picked) cancelEdit();
    setReplyNow(next);
  };
  const startEdit = (m: MessageView) => {
    saved.current = { id: m.id, text: saved.current?.text ?? getComposerText(phone) };
    setReplyNow(null);
    setEdit({ phone, m });
    setComposerText(phone, m.body ?? ''); // only ever an original (isCorrectable)
  };
  const editSent = (id: string) => {
    saved.current = saved.current?.id === id ? null : saved.current;
    setEdit((now) => (now?.m.id === id ? null : now));
  };
  return { reply, setReply, editing, startEdit, cancelEdit, editSent };
}
