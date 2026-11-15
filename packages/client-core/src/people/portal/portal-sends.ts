import { JOIN_ROLES, portalFileUrlSchema, type PortalFileUrl, type RoomJoinResult } from '@ab/shared';
import { z } from 'zod';
import type { ApiClient } from '../../core/http/index.js';

// The family portal's two writes: the guest admission to our classroom (inside the window only)
// and a signed link to a sent report's PDF (5 minutes) or a visible recording (an hour).

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
    fileUrl: ({ studentId, kind, id }) =>
      post(`${studentPath(studentId)}/${kind}/${enc(id)}/url`, portalFileUrlSchema),
  };
}
