import {
  channelKey,
  channelPollMs,
  channelMessagesPath,
  channelReadPath,
  olderCursor,
  portalUnreadPath,
  TEACHER_CHANNELS_PATH,
  type ChannelAudience,
} from '@ab/client-core';
import type { ChannelMessageView, ChannelPage, ChannelUnread, TeacherChannelRow } from '@ab/shared';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { INBOX_REFRESH_MS } from '@/features/messaging/inbox';
import { apiFetch, apiSend } from '@/lib/http/api';

// The student channel (docs/31 §2). Lists and badges poll while the window has focus; the thread has its
// socket (use-channel-live) and polls only as the fallback.
const poll = () => (document.hasFocus() ? INBOX_REFRESH_MS : false);

export interface ChannelRef {
  audience: ChannelAudience;
  studentId: string;
}

/** `live`: the thread's socket is joined (use-channel-live), so the poll is only the fallback. */
export const channelQuery = ({ audience, studentId }: ChannelRef, live = false) =>
  infiniteQueryOptions({
    queryKey: channelKey(audience, studentId),
    queryFn: ({ pageParam }) => apiFetch<ChannelPage>(channelMessagesPath({ audience, studentId, before: pageParam || undefined })),
    initialPageParam: '',
    getNextPageParam: olderCursor,
    refetchInterval: () => (document.hasFocus() ? channelPollMs(live) : false),
  });

export const sendChannelMessage = (ref: ChannelRef & { body: string }) =>
  apiSend<ChannelMessageView>('POST', channelMessagesPath(ref), { body: ref.body });

/** Read up to the newest message shown (the API never moves the mark past now). */
export const markChannelRead = ({ audience, studentId, at }: ChannelRef & { at: string }) =>
  apiSend<unknown>('POST', channelReadPath(audience, studentId), { at });

/** The list and badge keys a read or a send changes (never the open thread itself). */
export const CHANNEL_COUNT_KEYS = [['channel', 'teacher', 'list'], ['channel', 'portal']] as const;

export const teacherChannelsQuery = queryOptions({
  queryKey: ['channel', 'teacher', 'list'],
  queryFn: () => apiFetch<TeacherChannelRow[]>(TEACHER_CHANNELS_PATH),
  refetchInterval: poll,
});

export const portalUnreadQuery = (studentId: string) =>
  queryOptions({
    queryKey: ['channel', 'portal', studentId, 'unread'],
    queryFn: () => apiFetch<ChannelUnread>(portalUnreadPath(studentId)),
    refetchInterval: poll,
  });
