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
import {
  channelMessageViewSchema,
  channelPageSchema,
  type ChannelAttachmentInput,
  type TeacherChannelRow,
} from '@ab/shared';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend, env } from '#/lib/http/index.ts';

// The student channel (docs/31 §2). Lists and badges poll while the window has focus; the thread
// has its socket (use-channel-live) and polls only as the fallback.
const poll = () => (document.hasFocus() ? env.inboxRefreshMs : false);

export interface ChannelRef {
  audience: ChannelAudience;
  studentId: string;
}

/** `live`: the thread's socket is joined (use-channel-live), so the poll is only the fallback. */
export const channelQuery = ({ audience, studentId }: ChannelRef, live = false) =>
  infiniteQueryOptions({
    queryKey: channelKey(audience, studentId),
    queryFn: async ({ pageParam }) => {
      const before = pageParam || undefined;
      return channelPageSchema.parse(
        await apiFetch(channelMessagesPath({ audience, studentId, before })),
      );
    },
    initialPageParam: '',
    getNextPageParam: olderCursor,
    refetchInterval: () => (document.hasFocus() ? channelPollMs(live) : false),
  });

/** One send: the text (a file's caption, '' for none), the message it answers, the file. */
export interface ChannelSend {
  body: string;
  /** Rule 8: a retry of the same text resends its id and gets the stored message. */
  clientId: string;
  replyToId?: string | undefined;
  attachment?: ChannelAttachmentInput | undefined;
}

const storedMessage = (r: unknown) => channelMessageViewSchema.parse(r);

/** POST …/messages (channelPostSchema): the optional fields only when set; the stored message. */
export const sendChannelMessage = (ref: ChannelRef, send: ChannelSend) =>
  apiSend('POST', channelMessagesPath(ref), {
    body: send.body,
    client_id: send.clientId,
    ...(send.replyToId ? { reply_to_id: send.replyToId } : {}),
    ...(send.attachment ? { attachment: send.attachment } : {}),
  }).then(storedMessage);

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
