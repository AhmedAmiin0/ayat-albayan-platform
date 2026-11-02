// Test fixtures for scheduled meetings and invitations (R-MEET-01..03; not shipped: *.fakes.ts).
import type { TablesInsert } from '@ab/db';
import type { TestingModuleBuilder } from '@nestjs/testing';
import { vi } from 'vitest';
import { PushService } from '@/common/push/push.service';
import { TeacherScopes } from '@/modules/messaging/inbox/teacher-threads/teacher-scope';
import { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import { ThreadMessagesRepo } from '@/modules/messaging/inbox';
import { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';
import { meetingRow } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.fakes';
import { MeetingInviteeRepo } from './meeting-invitee.repo';
import { MeetingInviteesRepo, type StoredInvitee } from './meeting-invitees.repo';
import { MeetingListRepo } from '@/modules/teaching/classroom/meetings/schedule/meeting-list.repo';

export const STAFF_ID = 'f0000000-0000-4000-8000-000000000007';
export const STUDENT_A = '10000000-0000-4000-8000-00000000000a';
export const STUDENT_B = '10000000-0000-4000-8000-00000000000b';
/** Fake numbers only (never a real family). */
export const OPEN_PHONE = '+201000000101';
export const CLOSED_PHONE = '+201000000102';
const HOUR_MS = 3_600_000;

/** A v_threads row whose notifications window opened an hour before `now`. */
export const openThread = (phone: string, now: Date) => ({
  phone_e164: phone,
  lead_id: null,
  guardian_id: 'g1',
  last_chat_inbound_at: null,
  last_notifications_inbound_at: new Date(now.getTime() - HOUR_MS).toISOString(),
});

let seq = 0;
/** What the insert returns: the row as stored, with an id. */
export const stored = (r: TablesInsert<'meeting_invitees'>): StoredInvitee => ({
  id: `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`,
  meeting_id: r.meeting_id,
  kind: r.kind,
  profile_id: r.profile_id ?? null,
  student_id: r.student_id ?? null,
  phone_e164: r.phone_e164 ?? null,
  display_name: r.display_name,
  tz: r.tz ?? 'UTC',
  channel: r.channel,
  status: r.status ?? 'pending',
  error_code: null,
  sent_at: null,
});

const listQueries = () => ({
  latest: vi.fn().mockResolvedValue([meetingRow()]),
  upcoming: vi.fn().mockResolvedValue([]),
  myInvites: vi.fn().mockResolvedValue([]),
  byIds: vi.fn().mockResolvedValue([]),
  counts: vi.fn().mockResolvedValue(new Map<string, number>()),
});

const inviteesQueries = () => ({
  forMeeting: vi.fn().mockResolvedValue([]),
  byId: vi.fn().mockResolvedValue(null),
  insert: vi.fn(async (rows: TablesInsert<'meeting_invitees'>[]) => rows.map(stored)),
  update: vi.fn().mockResolvedValue(undefined),
  clearTokens: vi.fn().mockResolvedValue(undefined),
  whatsappSince: vi.fn().mockResolvedValue(0),
  queued: vi.fn().mockResolvedValue(false),
  dropQueuedInvites: vi.fn().mockResolvedValue([]),
  deliveredPhones: vi.fn().mockResolvedValue(new Set<string>()),
});

export const pickQueries = () => ({
  staff: vi.fn().mockResolvedValue([]),
  students: vi.fn().mockResolvedValue([]),
  teacherStudentIds: vi.fn().mockResolvedValue([]),
  assistantStudentIds: vi.fn().mockResolvedValue([]),
  guardianByPhone: vi.fn().mockResolvedValue(null),
  profileTz: vi.fn().mockResolvedValue('Africa/Cairo'),
});

/** A teacher's inbox scope: the two test families, not their own number. */
export const teacherScopesFake = () => ({
  of: vi.fn().mockResolvedValue({ teacherId: 't1', teacherName: 'مريم', phones: new Set([OPEN_PHONE, CLOSED_PHONE]), ownPhone: null }),
});

const threadsFake = () => ({ thread: vi.fn().mockResolvedValue(null), enqueue: vi.fn().mockResolvedValue({ id: 'm1' }) });

export function meetingInviteMocks() {
  return {
    lists: listQueries(),
    invitees: inviteesQueries(),
    picks: pickQueries(),
    threads: threadsFake(),
    teacherScopes: teacherScopesFake(),
    push: { notifyProfiles: vi.fn().mockResolvedValue(undefined), notifyAdmins: vi.fn() },
    sender: { kick: vi.fn().mockResolvedValue(undefined) },
  };
}
type MeetingInviteMocks = ReturnType<typeof meetingInviteMocks>;

/** The HTTP harness: every DB-facing piece of the invitations replaced by the mocks. */
export const overrideMeetingInvites = (b: TestingModuleBuilder, m: MeetingInviteMocks): TestingModuleBuilder =>
  b
    .overrideProvider(MeetingListRepo).useValue(m.lists)
    .overrideProvider(MeetingInviteesRepo).useValue(m.invitees)
    .overrideProvider(MeetingInviteeRepo).useValue(m.picks)
    .overrideProvider(ThreadsRepo).useValue(m.threads)
    .overrideProvider(ThreadMessagesRepo).useValue(m.threads)
    .overrideProvider(TeacherScopes).useValue(m.teacherScopes)
    .overrideProvider(PushService).useValue(m.push)
    .overrideProvider(MessageSender).useValue(m.sender);

/** Back to the happy-path defaults (beforeEach, after vi.resetAllMocks). */
export const resetMeetingInvites = (m: MeetingInviteMocks): void => {
  const fresh = meetingInviteMocks();
  for (const key of Object.keys(fresh) as (keyof MeetingInviteMocks)[]) Object.assign(m[key], fresh[key]);
};
