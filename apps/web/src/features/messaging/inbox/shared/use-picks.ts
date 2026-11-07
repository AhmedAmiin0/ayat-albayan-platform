import type { MessageQuote, MessageView } from '@ab/shared';
import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  draftGeneration,
  getDraft,
  keptFailed,
  setDraft,
} from '@/features/messaging/inbox/composer/lib/draft-store';
import { quoteOf } from '@/features/messaging/inbox/messages/lib/quote';

/**
 * The box's own draft from before «تعديل», the edit SESSION (one per tap on «تعديل»: a correction
 * sent from an earlier tap never ends a newer one, #694 follow-up item 4) and the draft store's
 * generation when the edit started (a sign-out since: nothing is written back, round 4).
 */
type Saved = { session: string; text: string; gen: number } | null;

/** The message being corrected and the session its sends carry. */
type Editing = { message: MessageView; session: string } | null;

/** The box gets `text` (an unconfirmed send keeps its pinned id), unless `gen` has ended. */
const putBox = (phone: string, text: string, gen = draftGeneration()) =>
  setDraft(phone, { text, failed: keptFailed(getDraft(phone).failed) }, gen);

/** An edit that ends without a send: the box's own draft comes back (same session only). */
function restore(phone: string, saved: RefObject<Saved>): void {
  const was = saved.current;
  saved.current = null;
  if (was) putBox(phone, was.text, was.gen);
}

/** Leaving the chat (another chat, the pane closed) mid-edit ends it as ✕ does. */
function useRestoreOnLeave(phone: string, saved: RefObject<Saved>): void {
  useEffect(() => () => restore(phone, saved), [phone, saved]);
}

/** ✕ (no id), or the send that answered `id` while it is still the one picked. */
const clearIf = (id: string | undefined) => (now: MessageQuote | null) =>
  id === undefined || now?.id === id ? null : now;

/**
 * A sent correction ends its own session only (never a newer «تعديل»): the box's draft from
 * before the edit comes back when the box is still empty (#694 follow-up item 6).
 */
function sentEdit(phone: string, saved: RefObject<Saved>, session: string): boolean {
  const was = saved.current;
  if (was?.session !== session) return false;
  saved.current = null;
  const empty = getDraft(phone).text === '';
  if (empty) putBox(phone, was.text, was.gen);
  return true;
}

/**
 * «رد» and «تعديل»: what the next text answers or corrects; picking one clears the other. An
 * edit keeps the box's draft from before it: ✕, «رد», leaving the chat or its sent correction
 * (into a still empty box) brings it back (review of #694).
 */
export function usePicks(phone: string) {
  const [target, setTarget] = useState<MessageQuote | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const saved = useRef<Saved>(null);
  useRestoreOnLeave(phone, saved);
  const endEdit = () => {
    setEditing(null);
    restore(phone, saved);
  };
  const reply = (m: MessageView) => {
    endEdit();
    setTarget(quoteOf(m));
  };
  const edit = (m: MessageView) => {
    const gen = saved.current?.gen ?? draftGeneration();
    const session = crypto.randomUUID();
    saved.current = { session, text: saved.current?.text ?? getDraft(phone).text, gen };
    setTarget(null);
    setEditing({ message: m, session });
    putBox(phone, m.body ?? ''); // «تعديل» is only ever on an original (isCorrectable)
  };
  const editSent = (session: string) => {
    if (sentEdit(phone, saved, session)) setEditing(null);
  };
  const cancelReply = (id?: string) => setTarget(clearIf(id));
  const cancelEdit = (session?: string) => (session === undefined ? endEdit() : editSent(session));
  const now = { editing: editing?.message ?? null, editSession: editing?.session ?? null };
  return { target, ...now, reply, edit, cancelReply, cancelEdit };
}
