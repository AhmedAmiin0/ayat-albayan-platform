// Test fixtures for the classroom tests (not shipped; excluded from the build by *.fakes.ts).
import { createHmac } from 'node:crypto';
import { vi } from 'vitest';
import type { AuthUser } from '../../common/auth/verify-token';
import type { ClassroomConfig } from './classroom.config';
import type { JoinLesson, JoinLinkRow } from './classroom.queries';
import { hashLinkToken } from './join-link.token';

export const CONFIG: NonNullable<ClassroomConfig> = {
  url: 'wss://livekit.example.test',
  apiKey: 'APIkey123',
  apiSecret: 'secret-secret-secret-secret-secret',
};
export const LESSON_ID = '00000000-0000-4000-8000-0000000000d1';
export const STUDENT_ID = '00000000-0000-4000-8000-0000000000c1';
export const TEACHER_ID = '00000000-0000-4000-8000-0000000000b1';
export const LINK_TOKEN = 'abcdefghijklmnopqrstuvwxyz012345';
/** Lesson 16:00 to 17:00 UTC: the room is open 15:45 to 19:00. */
export const LESSON: JoinLesson = {
  id: LESSON_ID,
  teacher_id: TEACHER_ID,
  starts_at: '2026-10-05T16:00:00.000Z',
  ends_at: '2026-10-05T17:00:00.000Z',
  status: 'scheduled',
  room_opened_at: null,
};
export const OPEN = new Date('2026-10-05T16:05:00Z');
export const EARLY = new Date('2026-10-05T15:00:00Z');
export const CLOSED = new Date('2026-10-05T19:30:00Z');

export const ADMIN: AuthUser = { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' };
export const TEACHER: AuthUser = { id: 'b0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' };
export const OTHER_TEACHER: AuthUser = { id: 'b0000000-0000-4000-8000-000000000003', email: null, role: 'teacher' };
export const ASSISTANT: AuthUser = { id: 'd0000000-0000-4000-8000-000000000005', email: null, role: 'assistant' };
export const SALES: AuthUser = { id: 'e0000000-0000-4000-8000-000000000006', email: null, role: 'sales' };
export const GUARDIAN: AuthUser = { id: 'c0000000-0000-4000-8000-000000000004', email: null, role: 'guardian' };

export const linkRow = (over: Partial<JoinLinkRow> = {}): JoinLinkRow => ({
  id: '00000000-0000-4000-8000-0000000000f1',
  lesson_id: LESSON_ID,
  token_hash: hashLinkToken(LINK_TOKEN),
  expires_at: '2026-10-05T19:00:00.000Z',
  revoked_at: null,
  created_by: ADMIN.id,
  created_at: '2026-10-05T09:00:00.000Z',
  student_id: null,
  ...over,
});

/** Mocked ClassroomQueries with the happy-path defaults. */
export function queries() {
  return {
    lesson: vi.fn().mockResolvedValue(LESSON),
    teacherName: vi.fn().mockResolvedValue('أبرار'),
    profileName: vi.fn().mockResolvedValue('نور'),
    assistsLesson: vi.fn().mockResolvedValue(true),
    salesOwnsLesson: vi.fn().mockResolvedValue(true),
    sendContext: vi.fn().mockResolvedValue({
      student: { id: STUDENT_ID, name: 'سهيلة' },
      guardian: { id: '00000000-0000-4000-8000-0000000000a1', phone: '+966501234567' },
    }),
    insertLink: vi.fn().mockResolvedValue(linkRow()),
    linkByHash: vi.fn().mockResolvedValue(linkRow()),
    openRoom: vi.fn(async (_id: string, at: string) => ({ ...LESSON, room_opened_at: at })),
  };
}

export type Claims = {
  iss: string; sub: string; name: string; nbf: number; exp: number; metadata?: string;
  video: { roomJoin: boolean; room: string; canPublish: boolean; canSubscribe: boolean; canPublishData: boolean; canPublishSources?: string[] };
};

/** Decodes a join token and checks its HS256 signature against `secret`. */
export function decode(token: string, secret = CONFIG.apiSecret): Claims & { validSignature: boolean } {
  const [head = '', body = '', sig = ''] = token.split('.');
  const expected = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  const claims: Claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  return { ...claims, validSignature: sig === expected };
}
