import {
  channelPresenceRoutes,
  channelTeacherMessageRoutes,
  channelTeacherRoutes,
} from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { TeacherChannelCalls } from './channel-calls.types';

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
