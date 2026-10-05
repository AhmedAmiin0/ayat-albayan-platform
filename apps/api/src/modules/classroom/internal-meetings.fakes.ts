// Test fixtures for «اجتماع داخلي» (not shipped; excluded from the build by *.fakes.ts).
import { vi } from 'vitest';
import { TEACHER } from './classroom.fakes';
import type { MeetingRow } from './internal-meetings.queries';

export const MEETING_ID = '00000000-0000-4000-8000-0000000000e1';
/** 43 base64url characters, like newMeetingToken. */
export const MEETING_TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';
export const NOW = new Date('2026-10-05T10:00:00Z');

/** An open meeting created by TEACHER. */
export const meetingRow = (over: Partial<MeetingRow> = {}): MeetingRow => ({
  id: MEETING_ID,
  title: 'اجتماع الإدارة',
  created_by: TEACHER.id,
  created_at: '2026-10-05T09:00:00.000Z',
  ends_at: null,
  revoked: false,
  ...over,
});

/** Mocked InternalMeetingsQueries with the happy-path defaults. */
export function meetingQueries() {
  return {
    insert: vi.fn(async (r: { title: string; createdBy: string }) => meetingRow({ title: r.title, created_by: r.createdBy })),
    byId: vi.fn().mockResolvedValue(meetingRow()),
    byHash: vi.fn().mockResolvedValue(meetingRow()),
    latest: vi.fn().mockResolvedValue([meetingRow()]),
    end: vi.fn(async (_id: string, at: string) => meetingRow({ ends_at: at })),
    rotate: vi.fn().mockResolvedValue(undefined),
    profileName: vi.fn().mockResolvedValue('نور'),
    defaultTitle: vi.fn().mockResolvedValue('اجتماع'),
  };
}
