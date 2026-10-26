import type { ChannelPage } from '@ab/shared';

// The student channel (docs/31 §2) for web and mobile: who reads it through which API path.
// teacher = «رسائل الطلاب»; portal = the family; admin = student_channels.monitor; sales = the owning assistant.

export type ChannelAudience = 'teacher' | 'portal' | 'admin' | 'sales';

/** Only participants write and mark read; monitors read. */
export const CHANNEL_WRITES: Readonly<Record<ChannelAudience, boolean>> = { teacher: true, portal: true, admin: false, sales: false };

/** The thread re-reads this often while it is on screen (the inbox polls the same way). */
export const CHANNEL_REFRESH_MS = 15_000;

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
