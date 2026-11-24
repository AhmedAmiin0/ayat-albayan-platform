import type { MessageStatus } from '@ab/catalog';

// Delivery ticks shared by web and mobile; failed uses the act tone; manual adds a word.

export type TickKind = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'manual';

/** Grey tick, read blue, or the act tone when failed. */
export type TickTone = 'muted' | 'read' | 'act';

const KIND: Record<MessageStatus, TickKind> = {
  queued: 'pending',
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
  sent_manually: 'manual',
};

export const messageTicks = (status: MessageStatus): TickKind => KIND[status];

export const tickTone = (kind: TickKind): TickTone =>
  kind === 'read' ? 'read' : kind === 'failed' ? 'act' : 'muted';

/** Failed has no word in a thread row, whose own word already says it. */
export function tickWord(kind: TickKind, inList = false): 'failed' | 'manual' | null {
  if (kind === 'failed') return inList ? null : 'failed';
  return kind === 'manual' ? 'manual' : null;
}

/** The CRM answered after our timeout (docs/19): never shown failed, confirmation awaited. */
const UNCONFIRMED_CODES: readonly string[] = ['uncertain', 'crm_uncertain'];

/** A failed row that may have reached the family: unconfirmed wording, same mark and tone. */
export const sendUnconfirmed = (
  status: MessageStatus,
  errorCode: string | null | undefined,
): boolean => status === 'failed' && UNCONFIRMED_CODES.includes(errorCode ?? '');

export type BubbleWord = 'failed' | 'unconfirmed' | 'manual';

/** On a bubble the failed word becomes unconfirmed when the send may have gone. */
export function bubbleWord(
  status: MessageStatus,
  errorCode?: string | null,
  inList = false,
): BubbleWord | null {
  const word = tickWord(messageTicks(status), inList);
  return word === 'failed' && sendUnconfirmed(status, errorCode) ? 'unconfirmed' : word;
}

// Stroked paths on the 20px / 1.6-stroke icon grid (web components/ui/icon.tsx). Ticks are not
// directional: WhatsApp draws them the same way in Arabic and English.
const CLOCK = 'M15.5 10a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0ZM10 7v3l2 1.3';
const ONE = 'm5 10.5 3.5 3.5 7.5-8';
const TWO = 'm1.5 10.5 3.5 3.5 7.5-8M9.6 12.6l1.4 1.4 7.5-8';
const ALERT = 'M16.5 10a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0ZM10 6.5v4M10 13.5h.01';

export const TICK_PATHS: Record<TickKind, string> = {
  pending: CLOCK,
  sent: ONE,
  delivered: TWO,
  read: TWO,
  failed: ALERT,
  manual: TWO,
};
