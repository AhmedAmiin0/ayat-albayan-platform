import { defineRoute, id, type RouteList } from '@ab/core';
import { z } from 'zod';
import { signedUploadSchema } from '../../reports';
import { channelEditSchema } from './channel';
import { channelUploadSchema } from './channel-media';
import { channelMessageViewSchema, channelReadsSchema } from './channel.schemas';

interface ChatAt {
  /** The chat's base path, ending in `/students/:id/channel`. */
  chat: string;
  permissions: RouteList;
}

const tags = ['student-channels'] as const;
const byStudent = z.object({ id: id() });
const byMessage = z.object({ id: id(), messageId: id() });
const MESSAGE = 'messages/:messageId';

/**
 * A participant's file upload slot, a message's read info, and the sender's edit and delete for
 * everyone (15 min and 48 h windows, docs/31 §2) at one chat path.
 */
const participantMessageRoutes = ({ chat, permissions }: ChatAt) => ({
  upload: defineRoute({
    method: 'POST',
    path: `${chat}/attachments/upload-url`,
    params: byStudent,
    body: channelUploadSchema,
    response: signedUploadSchema,
    permissions,
    tags,
  }),
  reads: defineRoute({
    method: 'GET',
    path: `${chat}/${MESSAGE}/reads`,
    params: byMessage,
    response: channelReadsSchema,
    permissions,
    tags,
  }),
  edit: defineRoute({
    method: 'PATCH',
    path: `${chat}/${MESSAGE}`,
    params: byMessage,
    body: channelEditSchema,
    response: channelMessageViewSchema,
    permissions,
    tags,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: `${chat}/${MESSAGE}`,
    params: byMessage,
    response: channelMessageViewSchema,
    permissions,
    tags,
  }),
});

/** The family's chat with their own student's teacher. */
export const channelPortalMessageRoutes = participantMessageRoutes({
  chat: '/portal/students/:id/channel',
  permissions: ['self.portal'],
});

/** The assistant in the chat whose seat she holds. */
export const channelSalesMessageRoutes = participantMessageRoutes({
  chat: '/sales/students/:id/channel',
  permissions: ['self.sales'],
});

const TEACHER = '/teachers/me/channels/:studentId';
const teacherMessage = z.object({ studentId: id(), messageId: id() });
const teacher = { permissions: ['self.teacher'], tags } as const;

/** The teacher's side of the same routes, keyed by `studentId`. */
export const channelTeacherMessageRoutes = {
  upload: defineRoute({
    method: 'POST',
    path: `${TEACHER}/attachments/upload-url`,
    params: z.object({ studentId: id() }),
    body: channelUploadSchema,
    response: signedUploadSchema,
    ...teacher,
  }),
  reads: defineRoute({
    method: 'GET',
    path: `${TEACHER}/${MESSAGE}/reads`,
    params: teacherMessage,
    response: channelReadsSchema,
    ...teacher,
  }),
  edit: defineRoute({
    method: 'PATCH',
    path: `${TEACHER}/${MESSAGE}`,
    params: teacherMessage,
    body: channelEditSchema,
    response: channelMessageViewSchema,
    ...teacher,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: `${TEACHER}/${MESSAGE}`,
    params: teacherMessage,
    response: channelMessageViewSchema,
    ...teacher,
  }),
};

const monitor = { permissions: ['student_channels.monitor'], tags } as const;

/** The monitor's read info, and the admin's moderation delete (another monitor is refused). */
export const channelMonitorMessageRoutes = {
  reads: defineRoute({
    method: 'GET',
    path: `/students/:id/channel/${MESSAGE}/reads`,
    params: byMessage,
    response: channelReadsSchema,
    ...monitor,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: `/students/:id/channel/${MESSAGE}`,
    params: byMessage,
    response: channelMessageViewSchema,
    ...monitor,
  }),
};
