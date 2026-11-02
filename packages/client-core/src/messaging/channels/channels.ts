import { clockOf, dateText, localDateIn, type ChannelPage, type ClockCycle, type Locale } from '@ab/shared';

// The student channel (docs/31 §2) for web and mobile: who reads it through which API path.
// teacher = «رسائل الطلاب»; portal = the family; admin = student_channels.monitor; sales = the owning assistant.

export type ChannelAudience = 'teacher' | 'portal' | 'admin' | 'sales';

/** Only participants write and mark read; monitors read. */
export const CHANNEL_WRITES: Readonly<Record<ChannelAudience, boolean>> = { teacher: true, portal: true, admin: false, sales: false };

/** The thread re-reads this often while it is on screen (the inbox polls the same way). */
export const CHANNEL_REFRESH_MS = 15_000;

/** An open WhatsApp chat asks for a delta this often while on screen (GET /threads/:phone?after=, ~2 reads). */
export const INBOX_REFRESH_MS = 10_000;

/** An open WhatsApp chat re-reads its whole newest page this often (people, lessons, older ticks). */
export const THREAD_FULL_MS = 60_000;

/**
 * The chats list re-reads this often while on screen: 30 s while GET /threads re-aggregated every
 * message (server audit 2026-10-27), 15 s once it reads thread_summaries (migration 20261028000921).
 */
export const INBOX_LIST_REFRESH_MS = 15_000;

const BASE: Readonly<Record<ChannelAudience, (studentId: string) => string>> = {
  teacher: (id) => `/teachers/me/channels/${id}`,
  portal: (id) => `/portal/students/${id}/channel`,
  admin: (id) => `/students/${id}/channel`,
  sales: (id) => `/sales/students/${id}/channel`,
};

/** GET …/messages, paging back with `before`. */
export function channelMessagesPath(input: { audience: ChannelAudience; studentId: string; before?: string | undefined }): string {
  const path = `${BASE[input.audience](input.studentId)}/messages`;
  return input.before ? `${path}?before=${encodeURIComponent(input.before)}` : path;
}

/** GET …/presence: the chat's people this viewer may see online (docs/33). */
export const channelPresencePath = (audience: ChannelAudience, studentId: string): string =>
  `${BASE[audience](studentId)}/presence`;

/** POST …/read (participants only). */
export const channelReadPath = (audience: ChannelAudience, studentId: string): string => `${BASE[audience](studentId)}/read`;

export const channelKey = (audience: ChannelAudience, studentId: string) => ['channel', audience, studentId] as const;

/** The teacher's list and the family's unread badge. */
export const TEACHER_CHANNELS_PATH = '/teachers/me/channels';
export const portalUnreadPath = (studentId: string): string => `/portal/students/${studentId}/channel/unread`;

/** The next `before` of an infinite thread: the oldest message of the last page read, while more exist. */
export const olderCursor = (last: ChannelPage): string | undefined => (last.has_more ? last.messages[0]?.created_at : undefined);

/** Every page of an infinite thread (newest page first) as one list, oldest first. */
export function threadMessages(pages: readonly ChannelPage[] | undefined): ChannelPage['messages'] {
  return [...(pages ?? [])].reverse().flatMap((p) => p.messages);
}

/** A message's time on the viewer's clock (12 or 24 h): «14:05» today, «25 أكتوبر 14:05» on another day. */
export function channelTimeText(input: { iso: string; tz: string; now: Date; locale: Locale; cycle: ClockCycle }): string {
  const at = new Date(input.iso);
  const clock = clockOf(at, input);
  if (localDateIn(at, input.tz) === localDateIn(input.now, input.tz)) return clock;
  const day = dateText(at, input, { day: 'numeric', month: 'short' });
  return `${day} ${clock}`;
}
