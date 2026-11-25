import {
  portalFileUrlSchema,
  portalRoomLinkSchema,
  type PortalFileUrl,
  type PortalRoomLink,
} from '@ab/shared';
import { JOIN_ROLES, type RoomJoinResult } from '@ab/schedule';
import { z } from 'zod';
import type { ApiClient } from '../../core/http';

// The family portal's writes: the guest admission to our classroom (inside the window only), the
// signed /join link that opens it in the phone's browser (no second sign-in), and a signed link
// to a sent report's PDF (5 minutes) or a visible recording (an hour).

/** POST …/join's answer (@ab/schedule's RoomJoinResult), checked at the boundary (rule 12). */
export const roomJoinResultSchema = z.object({
  url: z.string(),
  token: z.string(),
  room: z.string(),
  role: z.enum(JOIN_ROLES),
  recording: z.enum(['on', 'off']).optional(),
  chat: z.boolean().optional(),
}) satisfies z.ZodType<RoomJoinResult>;

export interface PortalJoinInput {
  studentId: string;
  lessonId: string;
}

export type PortalFileKind = 'reports' | 'recordings';

export interface PortalFileInput {
  studentId: string;
  kind: PortalFileKind;
  id: string;
}

export interface PortalSends {
  join: (input: PortalJoinInput) => Promise<RoomJoinResult>;
  /** The lesson's room in the system browser: a signed /join URL, valid until the room closes. */
  roomLink: (input: PortalJoinInput) => Promise<PortalRoomLink>;
  fileUrl: (input: PortalFileInput) => Promise<PortalFileUrl>;
}

const enc = encodeURIComponent;
const studentPath = (id: string) => `/portal/students/${enc(id)}`;

export function portalSends(client: ApiClient): PortalSends {
  const post = <T>(path: string, schema: { parse: (v: unknown) => T }): Promise<T> =>
    client.apiSend('POST', path).then((r: unknown) => schema.parse(r));
  return {
    join: ({ studentId, lessonId }) =>
      post(`${studentPath(studentId)}/lessons/${enc(lessonId)}/join`, roomJoinResultSchema),
    roomLink: ({ studentId, lessonId }) =>
      post(`${studentPath(studentId)}/lessons/${enc(lessonId)}/room-link`, portalRoomLinkSchema),
    fileUrl: ({ studentId, kind, id }) =>
      post(`${studentPath(studentId)}/${kind}/${enc(id)}/url`, portalFileUrlSchema),
  };
}
