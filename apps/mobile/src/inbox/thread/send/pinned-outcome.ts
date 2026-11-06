import { replayedOther } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import { getComposerText, setComposerText } from '@/inbox/composer/draft-store';
import { unanswered } from './after-send';
import { PINS, type PinKind } from './pinned-send';

/** A send of the chat with its pin kind (none: templates, resend, new chat) and generation. */
interface PinnedSend {
  phone: string;
  id: string;
  /** What this send carried (the text, or a template's preview). */
  body: string;
  pin?: PinKind | undefined;
  /** The pin store's generation when the send started (a sign-out since: nothing is written). */
  generation: number;
}

const storeOf = (s: PinnedSend) => (s.pin ? PINS[s.pin] : undefined);

/** The box's text comes back (unless she typed another since), never after a sign-out. */
function restoreBox(s: PinnedSend): void {
  const live = PINS.box.generation() === s.generation;
  if (s.pin === 'box' && live) setComposerText(s.phone, getComposerText(s.phone) || s.body);
}

/**
 * A 2xx (hook-level onSuccess: it runs after the screen closed too). The pin is released. A send
 * with the pinned id answered with another body is the FIRST message: the note shows and the box
 * gets the edit back (docs/44 M1); its next send has a fresh id.
 */
export function settlePinned(s: PinnedSend, row: MessageView): void {
  const store = storeOf(s);
  if (!store) return;
  const lost = store.pinned(s.phone) === s.id && replayedOther(row, s.body);
  store.release(s.phone, s.id, s.generation);
  if (lost && store.generation() === s.generation) store.setReplayed(s.phone, true);
  if (lost) restoreBox(s);
}

/**
 * A failed send (hook-level onError). No answer pins the id, whether or not its bubble is still in
 * the cache; a 4xx (the server refused it, nothing landed) releases it. The box's text comes back.
 */
export function failPinned(s: PinnedSend, error: unknown): void {
  const store = storeOf(s);
  if (!store) return;
  const keep = unanswered(error) ? 'pin' : 'release';
  store[keep](s.phone, s.id, s.generation);
  restoreBox(s);
}

/** The generation a send of this kind starts in. */
export const pinGeneration = (pin: PinKind | undefined): number => PINS[pin ?? 'box'].generation();
