import {
  channelKey,
  channelPollMs,
  channelMessagesPath,
  channelReadPath,
  olderCursor,
  pathKey,
  portalUnreadPath,
  TEACHER_CHANNELS_PATH,
  type ChannelAudience,
} from '@ab/client-core';
import type { ChannelMessageView, ChannelPage, TeacherChannelRow } from '@ab/shared';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';
import { env } from '@ab/web-kit/lib/http/env';

// The student channel (docs/31 §2). Lists and badges poll while the window has focus; the thread has its
// socket (use-channel-live) and polls only as the fallback.
const poll = () => (document.hasFocus() ? env.inboxRefreshMs : false);

export interface ChannelRef {
  audience: ChannelAudience;
  studentId: string;
}

/** `live`: the thread's socket is joined (use-channel-live), so the poll is only the fallback. */
export const channelQuery = ({ audience, studentId }: ChannelRef, live = false) =>
  infiniteQueryOptions({
    queryKey: channelKey(audience, studentId),
    queryFn: ({ pageParam }) =>
      apiFetch<ChannelPage>(
        channelMessagesPath({ audience, studentId, before: pageParam || undefined }),
      ),
    initialPageParam: '',
    getNextPageParam: olderCursor,
    refetchInterval: () => (document.hasFocus() ? channelPollMs(live) : false),
  });

/** `clientId` (rule 8): a retry of the same text resends its id and gets the stored message. */
export const sendChannelMessage = (ref: ChannelRef & { body: string; clientId: string }) =>
  apiSend<ChannelMessageView>('POST', channelMessagesPath(ref), {
    body: ref.body,
    client_id: ref.clientId,
  });

/** Read up to the newest message shown (the API never moves the mark past now). */
export const markChannelRead = ({ audience, studentId, at }: ChannelRef & { at: string }) =>
  apiSend<unknown>('POST', channelReadPath(audience, studentId), { at });

/**
 * The list and badge keys a read or a send in this student's channel changes: the teacher's list
 * and the family's «المحادثة» badge (client-core portalUnreadQuery), never the open thread itself.
 */
export const channelCountKeys = (studentId: string): readonly (readonly string[])[] => [
  ['channel', 'teacher', 'list'],
  pathKey(portalUnreadPath(studentId)),
];

export const teacherChannelsQuery = queryOptions({
  queryKey: ['channel', 'teacher', 'list'],
  queryFn: () => apiFetch<TeacherChannelRow[]>(TEACHER_CHANNELS_PATH),
  refetchInterval: poll,
});
