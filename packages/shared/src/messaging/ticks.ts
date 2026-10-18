import type { MessageStatus } from '../enums/index.js';

// WhatsApp-style delivery ticks on OUR messages (owner, 2026-10-18), one truth for web and mobile:
// a clock while queued, one tick sent, two delivered, two in the read colour once read, a saffron «!»
// when it did not go out (the same «دورك» tone as its chip and the bubble's ring: status-style.ts). Sent by hand has no WhatsApp equivalent: two ticks plus the word «يدويًا».

export type TickKind = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'manual';

/** The ink a tick kind is drawn in: the tick grey, the read blue, or saffron («دورك») when failed. */
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

/** Only «يدويًا» keeps a word beside its ticks (t.messages.manualTick). */
export const tickHasWord = (kind: TickKind): boolean => kind === 'manual';

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
