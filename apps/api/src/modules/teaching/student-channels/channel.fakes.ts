// Test fixtures and HTTP harness for the student channel (test-only, excluded from the build by
// *.fakes.ts).
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '@/app.module';
import { bootWith } from '@/common/auth/auth.fakes';
import type { AuthUser } from '@/common/auth/verify-token';
import { PushService } from '@/common/push/push.service';
import { PortalScopeQueries } from '@/modules/people/portal/scope/portal-scope.queries';
import { TeachersQueries } from '@/modules/people/teachers';
import { AuditService } from '@/common/audit/audit.service';
import { ChannelEditsRepo } from './channel-edits.repo';
import { PresenceRepo, PresenceSettings } from '@/modules/people/presence';
import { fakePresence } from '@/modules/people/presence/presence.fakes';
import { ChannelPeopleQueries } from './channel-people.queries';
import type { ChannelMessageRow, ChannelSummaryRow } from './channel.queries';
import { ChannelQueries } from './channel.queries';

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
  /** A child's own login (a guardian chats for them). */
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
    insert: vi.fn(async (row: { body: string; sender_profile_id: string; sender_role: string }) =>
      messageRow({ id: 'm2', ...row }),
    ),
    setReadMark: vi.fn(
      async (row: { channelId: string; profileId: string; at: string }) => void row,
    ),
    teacherIds: vi.fn(async (): Promise<string[]> => ['t1']),
    teacherStudentIds: vi.fn(async () => [ST]),
    summaries: vi.fn(async (): Promise<ChannelSummaryRow[]> => [
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
    names: vi.fn(
      async () =>
        new Map([
          ['p-g', 'أم سلمى'],
          ['p-t1', 'أبرار'],
        ]),
    ),
    ownedStudentIds: vi.fn(async (id: string) => (id === 'p-sa' ? [ST] : [])),
    teacherProfiles: vi.fn(async () => ['p-t1']),
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
  };
  const audit = { record: vi.fn(async () => undefined) };
  const presence = fakePresence();
  const push = {
    notifyProfiles: vi.fn(async () => undefined),
    notifyAdmins: vi.fn(),
    notifySales: vi.fn(),
  };
  const overrides: [unknown, unknown][] = [
    [ChannelQueries, queries], [ChannelPeopleQueries, people], [PortalScopeQueries, scope],
    [TeachersQueries, teachers], [PushService, push], [ChannelEditsRepo, edits],
    [AuditService, audit], [PresenceRepo, presence.repo], [PresenceSettings, presence.settings],
  ];
  const builder = overrides.reduce(
    (b, [token, value]) => b.overrideProvider(token).useValue(value),
    Test.createTestingModule({ imports: [AppModule] }),
  );
  const app = await bootWith(builder, USERS);
  const call = (method: 'GET' | 'POST' | 'DELETE', url: string, who: Who) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${who}` } });
  const send = (method: 'POST' | 'PATCH') => (url: string, who: Who, payload: object) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${who}` }, payload });
  return {
    app,
    call,
    post: send('POST'),
    patch: send('PATCH'),
    queries,
    people,
    scope,
    teachers,
    push,
    edits,
    audit,
    presence,
  };
}
