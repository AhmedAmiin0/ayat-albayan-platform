import {
  channelPresenceRoutes,
  channelTeacherMessageRoutes,
  channelTeacherRoutes,
} from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ChannelWriteCalls, TeacherChannelCalls } from './channel-calls.types';

/** The teacher's chats with the families of their students; answers parsed strictly. */
export function teacherChannelCalls(client: ApiClient): TeacherChannelCalls {
  const call = callWith(client);
  return {
    list: () => call({ route: channelTeacherRoutes.list }),
    page: ({ studentId, before }) =>
      call({ route: channelTeacherRoutes.page, params: { studentId }, query: { before } }),
    presence: (id) => call({ route: channelPresenceRoutes.teacher, params: { id } }),
    reads: (params) => call({ route: channelTeacherMessageRoutes.reads, params }),
    remove: (params) => call({ route: channelTeacherMessageRoutes.remove, params }),
  };
}

/** The teacher's send, read mark, file slot and edit. */
export function teacherChannelWrites(client: ApiClient): ChannelWriteCalls {
  const call = callWith(client);
  return {
    post: ({ studentId, post }) =>
      call({ route: channelTeacherRoutes.post, params: { studentId }, body: post }),
    read: ({ studentId, at }) =>
      call({ route: channelTeacherRoutes.read, params: { studentId }, body: { at } }),
    upload: ({ studentId, file }) =>
      call({ route: channelTeacherMessageRoutes.upload, params: { studentId }, body: file }),
    edit: ({ studentId, messageId, body }) =>
      call({
        route: channelTeacherMessageRoutes.edit,
        params: { studentId, messageId },
        body: { body },
      }),
  };
}
