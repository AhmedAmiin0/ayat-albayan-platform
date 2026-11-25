// Test fixtures and HTTP harness for the student channel (test-only, excluded from the build).
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '@/app.module';
import { bootWith } from '@/common/auth/auth.fakes';
import type { AuthUser } from '@/common/auth/verify-token';
import { PushService, type PushTarget } from '@/common/push/push.service';
import { PortalScopeRepo } from '@/modules/people/portal/scope/portal-scope.repo';
import { TeachersRepo } from '@/modules/people/teachers';
import { AuditService } from '@/common/audit/audit.service';
import { ChannelEditsRepo } from './channel-edits.repo';
import { PresenceRepo, PresenceSettings } from '@/modules/people/presence';
import { fakePresence } from '@/modules/people/presence/presence.fakes';
import { ChannelPeopleRepo } from './channel-people.repo';
import type { ChannelMessageRow, ChannelSummaryRow } from './channel.repo';
import { ChannelRepo } from './channel.repo';
import { FamilyChatSettings, TeacherChatSettings } from './family-chat.settings';
import { channelExtras } from './testing/channel-extras.fakes';
import { ChannelBellRepo } from './notify/channel-bell.repo';
import { ChannelReadsRepo } from './reads/channel-reads.repo';
import type { ClientSend, NewChannelMessage } from './send/channel-row';
import { StorageService } from '@/common/storage/storage.service';
import type { ChannelClosedReason } from '@ab/shared';
import { ChannelSeatRepo } from './seat/channel-seat.repo';
import { fakeSeats } from './seat/seat.fakes';

type SummaryInput = Parameters<ChannelRepo['summaries']>[0];

export const ST = '52000000-0000-4000-8000-000000000001';
/** Another family's child. */
export const OTHER = '52000000-0000-4000-8000-000000000002';
export const CH = 'c3000000-0000-4000-8000-000000000001';

const USERS: Record<string, AuthUser> = {
  teacher: { id: 'p-t1', email: null, role: 'teacher' },
  oldTeacher: { id: 'p-t2', email: null, role: 'teacher' },
  guardian: { id: 'p-g', email: null, role: 'guardian' },
  otherGuardian: { id: 'p-g2', email: null, role: 'guardian' },
  /** An adult student who is their own contact (contact_is_self). */
  student: { id: 'p-s', email: null, role: 'student' },
  /** A child's own login (chats too). */
  child: { id: 'p-c', email: null, role: 'student' },
  admin: { id: 'p-ad', email: null, role: 'admin' },
  sales: { id: 'p-sa', email: null, role: 'sales' },
  otherSales: { id: 'p-sb', email: null, role: 'sales' },
  assistant: { id: 'p-as', email: null, role: 'assistant' },
};
export type Who = keyof typeof USERS;

export const messageRow = (over: Partial<ChannelMessageRow> = {}): ChannelMessageRow => ({
  id: 'm1',
  body: 'السلام عليكم',
  sender_profile_id: 'p-g',
  sender_role: 'guardian',
  created_at: '2026-10-27T10:00:00.000Z',
  ...over,
});

export async function channelApp() {
  // The student's current teacher is t1 (p-t1); t2 taught them before and no longer does.
  const queries = {
    channelOf: vi.fn(async () => CH),
    isOpen: vi.fn(async () => true),
    page: vi.fn(async (): Promise<ChannelMessageRow[]> => [messageRow()]),
    insert: vi.fn(async (row: NewChannelMessage) => ({
      row: messageRow({ id: 'm2', ...row }),
      created: true,
    })),
    byClientId: vi.fn(async (_send: ClientSend): Promise<ChannelMessageRow | null> => null),
    closedReason: vi.fn(async (): Promise<ChannelClosedReason | null> => 'not_subscribed'),
    setReadMark: vi.fn(
      async (_row: { channelId: string; profileId: string; at: string }) => undefined,
    ),
    teacherIds: vi.fn(async (): Promise<string[]> => ['t1']),
    teacherStudentIds: vi.fn(async () => [ST]),
    summaries: vi.fn(async (_in: SummaryInput): Promise<ChannelSummaryRow[]> => [
      {
        student_id: ST,
        unread: 2,
        last_body: 'السلام عليكم',
        last_role: 'guardian',
        last_at: '2026-10-27T10:00:00.000Z',
      },
    ]),
  };
  const people = {
    students: vi.fn(async (ids: readonly string[]) =>
      ids
        .filter((id) => id === ST || id === OTHER)
        .map((id) => ({ id, name: 'سلمى', code: 'AB-0201' })),
    ),
    names: vi.fn(async () => new Map([['p-g', 'أم سلمى'], ['p-t1', 'أبرار']])),
    assistantId: vi.fn(async (): Promise<string | null> => 'p-sa'), // the seat holder
  };
  const own = (contactIsSelf: boolean) => [
    { id: ST, code: 'AB-0201', name: 'سلمى', tz: 'Asia/Riyadh', contact_is_self: contactIsSelf },
  ];
  const scope = {
    studentsOf: vi.fn(async (id: string) =>
      id === 'p-g' || id === 'p-c' ? own(false) : id === 'p-s' ? own(true) : [],
    ),
  };
  const teachers = {
    idByProfile: vi.fn(async (id: string) => ({ 'p-t1': 't1', 'p-t2': 't2' })[id] ?? null),
  };
  // Edits: the message read and the compare-and-set writes (ChannelEditsRepo), and the audit trail.
  const edits = {
    message: vi.fn(async (): Promise<ChannelMessageRow | null> => messageRow()),
    edit: vi.fn(
      async (c: { id: string; body: string; at: string }): Promise<ChannelMessageRow | null> =>
        messageRow({ id: c.id, body: c.body, edited_at: c.at }),
    ),
    remove: vi.fn(async (c: { id: string; at: string }): Promise<ChannelMessageRow | null> =>
      messageRow({ id: c.id, body: '-', deleted_at: c.at }),
    ),
    deletedIds: vi.fn(async (_ids: readonly string[]) => new Set<string>()),
  };
  const extras = channelExtras();
  const audit = { record: vi.fn(async () => undefined) };
  const familyChat = { enabled: vi.fn(async () => true) }; // family_chat_enabled on, as before
  const teacherChat = { enabled: vi.fn(async () => true) }; // teacher_student_messages_enabled
  const presence = fakePresence();
  const seats = fakeSeats([ST, OTHER]);
  const push = {
    notifyProfiles: vi.fn(async (_target: PushTarget) => undefined),
    notifyAdmins: vi.fn(),
    notifySales: vi.fn(),
  };
  const overrides: [unknown, unknown][] = [
    [ChannelRepo, queries], [ChannelPeopleRepo, people], [PortalScopeRepo, scope],
    [TeachersRepo, teachers], [PushService, push], [ChannelEditsRepo, edits],
    [AuditService, audit], [PresenceRepo, presence.repo], [PresenceSettings, presence.settings],
    [FamilyChatSettings, familyChat], [TeacherChatSettings, teacherChat],
    [ChannelReadsRepo, extras.reads],
    [ChannelBellRepo, extras.bell], [StorageService, extras.storage], [ChannelSeatRepo, seats.repo],
  ];
  const builder = overrides.reduce(
    (b, [token, value]) => b.overrideProvider(token).useValue(value),
    Test.createTestingModule({ imports: [AppModule] }),
  );
  const app = await bootWith(builder, USERS);
  const call = (method: 'GET' | 'POST' | 'DELETE', url: string, who: Who) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${who}` } });
  const send = (method: 'POST' | 'PATCH' | 'PUT') => (url: string, who: Who, payload: object) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${who}` }, payload });
  const fakes = { queries, people, scope, teachers, push, edits, audit, presence, familyChat,
    teacherChat };
  const writes = { post: send('POST'), patch: send('PATCH'), put: send('PUT') };
  return { app, call, ...writes, ...fakes, seats, ...extras };
}
