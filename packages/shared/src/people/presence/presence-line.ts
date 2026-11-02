import { presenceWhen, type PresenceWhenInput, type PresenceWords } from './presence-when.js';

/** ar.json / en.json `presence`: the header words around presenceWhen. */
export interface PresenceText extends PresenceWords {
  /** «متصل الآن» */
  online: string;
  /** «آخر ظهور {when}» */
  lastSeen: string;
  /** «آخر رسالة {when}» (a WhatsApp contact: Meta shares no presence) */
  lastMessage: string;
}

/** Without a live socket, someone active this recently reads as online (docs/33 §1.1). */
export const PRESENCE_RECENT_MS = 2 * 60_000;

/** The most topics one screen watches (the staff list); Realtime allows 100 channels per client. */
export const PRESENCE_WATCH_MAX = 80;

export interface OnlineInput {
  /** The watch joined (Realtime answered); false: Realtime is down or absent. */
  live: boolean;
  /** The person's topic holds a tracked meta. */
  present: boolean;
  lastSeenAt: string | null;
  now: Date;
}

/** Online: present on a live socket; with no socket, active within PRESENCE_RECENT_MS. */
export function isOnline({ live, present, lastSeenAt, now }: OnlineInput): boolean {
  if (live) return present;
  if (!lastSeenAt) return false;
  const ago = now.getTime() - Date.parse(lastSeenAt);
  return Number.isFinite(ago) && ago < PRESENCE_RECENT_MS;
}

type LineInput = Omit<PresenceWhenInput, 'iso' | 'words'> & { words: PresenceText };

const fill = (template: string, when: string): string => template.split('{when}').join(when);

/** «متصل الآن», else «آخر ظهور …», else '' (never seen). */
export function presenceLine(
  input: LineInput & { online: boolean; lastSeenAt: string | null },
): string {
  if (input.online) return input.words.online;
  if (!input.lastSeenAt) return '';
  return fill(input.words.lastSeen, presenceWhen({ ...input, iso: input.lastSeenAt }));
}

/** «آخر رسالة …» from a WhatsApp thread's last inbound time; '' when they never wrote. */
export function lastMessageLine(input: LineInput & { lastInboundAt: string | null }): string {
  if (!input.lastInboundAt) return '';
  return fill(input.words.lastMessage, presenceWhen({ ...input, iso: input.lastInboundAt }));
}
