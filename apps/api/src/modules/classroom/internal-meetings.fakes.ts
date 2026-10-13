// Test fixtures for «اجتماع داخلي» (not shipped; excluded from the build by *.fakes.ts).
import { DEFAULT_JOIN_WINDOW } from '@ab/shared';
import { vi } from 'vitest';
import { TEACHER } from './classroom.fakes';
import type { MeetingRow, NewMeeting } from './internal-meetings.queries';

export const MEETING_ID = '00000000-0000-4000-8000-0000000000e1';
/** 43 base64url characters, like newMeetingToken. */
export const MEETING_TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';
export const NOW = new Date('2026-10-05T10:00:00Z');

/** An open instant meeting created by TEACHER. */
export const meetingRow = (over: Partial<MeetingRow> = {}): MeetingRow => ({
  id: MEETING_ID,
  title: 'اجتماع الإدارة',
  created_by: TEACHER.id,
  created_at: '2026-10-05T09:00:00.000Z',
  ends_at: null,
  revoked: false,
  starts_at: null,
  planned_end_at: null,
  cancelled_at: null,
  ...over,
});

/** A meeting scheduled 12:00–13:00 on NOW's day (its room opens 11:45, closes 15:00). */
export const scheduledRow = (over: Partial<MeetingRow> = {}): MeetingRow =>
  meetingRow({ starts_at: '2026-10-05T12:00:00.000Z', planned_end_at: '2026-10-05T13:00:00.000Z', ...over });

/** Mocked InternalMeetingsQueries with the happy-path defaults. */
export function meetingQueries() {
  return {
    insert: vi.fn(async (r: NewMeeting) =>
      meetingRow({ title: r.title, created_by: r.createdBy, starts_at: r.startsAt, planned_end_at: r.plannedEndAt }),
    ),
    byRequest: vi.fn().mockResolvedValue(null),
    byId: vi.fn().mockResolvedValue(meetingRow()),
    byHash: vi.fn().mockResolvedValue(meetingRow()),
    byInviteHash: vi.fn().mockResolvedValue(null),
    end: vi.fn(async (_id: string, at: string) => meetingRow({ ends_at: at })),
    update: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(true),
    rotate: vi.fn().mockResolvedValue(undefined),
    profileName: vi.fn().mockResolvedValue('نور'),
    defaultTitle: vi.fn().mockResolvedValue('اجتماع'),
    joinWindow: vi.fn().mockResolvedValue(DEFAULT_JOIN_WINDOW),
  };
}
