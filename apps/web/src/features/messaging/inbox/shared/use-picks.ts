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
 * The box's own draft from before «تعديل», the message being corrected and the draft store's
 * generation when the edit started (a sign-out since: nothing is written back, round 4).
 */
type Saved = { id: string; text: string; gen: number } | null;

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
const clearIf =
  <T extends { id: string }>(id: string | undefined) =>
  (now: T | null) =>
    id === undefined || now?.id === id ? null : now;

/**
 * «رد» and «تعديل»: what the next text answers or corrects; picking one clears the other. An
 * edit keeps the box's draft from before it: ✕, «رد» or leaving the chat brings it back (review
 * of #694); only its sent correction drops it.
 */
export function usePicks(phone: string) {
  const [target, setTarget] = useState<MessageQuote | null>(null);
  const [editing, setEditing] = useState<MessageView | null>(null);
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
    saved.current = { id: m.id, text: saved.current?.text ?? getDraft(phone).text, gen };
    setTarget(null);
    setEditing(m);
    putBox(phone, m.body ?? ''); // «تعديل» is only ever on an original (isCorrectable)
  };
  const editSent = (id: string) => {
    saved.current = saved.current?.id === id ? null : saved.current;
    setEditing(clearIf(id));
  };
  const cancelReply = (id?: string) => setTarget(clearIf(id));
  const cancelEdit = (id?: string) => (id === undefined ? endEdit() : editSent(id));
  return { target, editing, reply, edit, cancelReply, cancelEdit };
}
