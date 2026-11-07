import type { MessageView } from '@ab/shared';
import { type Dispatch, type RefObject, type SetStateAction, useEffect, useRef, useState } from 'react';
import { getComposerText, setComposerText } from '@/inbox/composer/draft-store';

/** What the box's next text answers («رد») or corrects («تعديل»): one of them at most. */
interface ComposeTarget {
  reply: MessageView | null;
  setReply: Dispatch<SetStateAction<MessageView | null>>;
  editing: MessageView | null;
  editSession: string | null;
  startEdit: (m: MessageView) => void;
  cancelEdit: () => void;
  editSent: (session: string) => void;
}

/**
 * The box's own draft from before «تعديل», and the edit SESSION: one per tap on «تعديل», so a
 * correction sent from an earlier tap never ends a newer one (#694 follow-up item 4).
 */
type Saved = { session: string; text: string } | null;

let sessions = 0;
const nextSession = (): string => {
  sessions += 1;
  return `edit-${sessions}`;
};

/**
 * A sent correction ends its own session only: the box's draft from before the edit comes back
 * when the box is still empty (#694 follow-up item 6). Whether it was that session.
 */
function sentEdit(phone: string, saved: RefObject<Saved>, session: string): boolean {
  const was = saved.current;
  if (was?.session !== session) return false;
  saved.current = null;
  const empty = getComposerText(phone) === '';
  if (empty) setComposerText(phone, was.text);
  return true;
}

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

/** An edit in progress: its chat, the message and its session. */
type Edit = { phone: string; m: MessageView; session: string } | null;

/** The edit as this chat sees it: a screen kept mounted on another chat is never in edit mode. */
const editOf = (edit: Edit, phone: string) =>
  edit?.phone === phone
    ? { editing: edit.m, editSession: edit.session }
    : { editing: null, editSession: null };

/**
 * One open chat's «رد» and «تعديل» (owner 2026-11-07), as WhatsApp: picking a reply ends an edit,
 * starting an edit drops the reply and puts the original's text in the box. An edit keeps the
 * box's draft from before it: ✕, a picked reply, leaving the chat or its sent correction (into a
 * still empty box) brings it back (review of #694). An updater (a send that settles its own
 * reply) never ends an edit.
 */
export function useComposeTarget(phone: string): ComposeTarget {
  const [reply, setReplyNow] = useState<MessageView | null>(null);
  const [edit, setEdit] = useState<Edit>(null);
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
    const session = nextSession();
    saved.current = { session, text: saved.current?.text ?? getComposerText(phone) };
    setReplyNow(null);
    setEdit({ phone, m, session });
    setComposerText(phone, m.body ?? ''); // only ever an original (isCorrectable)
  };
  const editSent = (session: string) => {
    if (sentEdit(phone, saved, session)) setEdit(null);
  };
  return { reply, setReply, ...editOf(edit, phone), startEdit, cancelEdit, editSent };
}
