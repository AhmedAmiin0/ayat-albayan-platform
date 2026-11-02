import type { Permission } from '@ab/shared';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import {
  PERMISSION_RESOLVER,
  systemResolver,
  TOKEN_VERIFIER,
  type TokenVerifier,
} from '@/common/auth/auth.guard';
import { AuthModule } from '@/common/auth/auth.module';
import type { PermissionResolver } from '@/common/auth/permissions';
import { AuditService } from '@/common/audit/audit.service';
import { DB, DbModule } from '@/common/db/db.module';
import { fakeDb, type FakeResult } from '@/modules/people/guardians/fake-db';
import { GuardianPhonesService } from '@/modules/people/guardians';
import { FamilyMoveService } from '@/modules/people/people-edit/family-move.service';
import { PeopleEditController } from '@/modules/people/people-edit/people-edit.controller';
import { PeopleEditRepo } from '@/modules/people/people-edit/people-edit.repo';
import { PeopleEditService } from '@/modules/people/people-edit/people-edit.service';
import { PeopleRoleController } from '@/modules/people/people-edit/people-role.controller';
import { PeopleViewService } from '@/modules/people/people-edit/people-view.service';
import { RoleSwitchService } from '@/modules/people/people-edit/role-switch.service';
import { StudentRecordsRepo } from '@/modules/people/people-edit/student-records.repo';

// Test helper (not a test): the two /people controllers over mocked services. Tokens are base
// roles; `sales-off` is a sales role whose admin switched the three people keys off.

const OFF: readonly Permission[] = [
  'people.edit',
  'students.attach_guardian',
  'people.switch_role',
];
type Role = 'admin' | 'sales' | 'teacher' | 'assistant' | 'guardian' | 'student';

const verify: TokenVerifier = async (token) => {
  await Promise.resolve();
  const role: Role = token === 'sales-off' ? 'sales' : (token as Role);
  return { id: `${token}-1`, email: null, role };
};
const resolver: PermissionResolver = async (user) => {
  const all = await systemResolver(user);
  return user.id === 'sales-off-1' ? all.filter((p) => !OFF.includes(p)) : all;
};

export const mocks = {
  people: { editStudent: vi.fn(), editGuardian: vi.fn() },
  views: { view: vi.fn() },
  phones: { removeSecond: vi.fn() },
  families: { families: vi.fn(), move: vi.fn() },
  roles: { setSelf: vi.fn(), guardianToStudent: vi.fn(), studentToGuardian: vi.fn() },
};

export async function peopleApp(): Promise<NestFastifyApplication> {
  const mod = await Test.createTestingModule({
    imports: [DbModule, AuthModule],
    controllers: [PeopleEditController, PeopleRoleController],
    providers: [
      { provide: PeopleEditService, useValue: mocks.people },
      { provide: GuardianPhonesService, useValue: mocks.phones },
      { provide: PeopleViewService, useValue: mocks.views },
      { provide: FamilyMoveService, useValue: mocks.families },
      { provide: RoleSwitchService, useValue: mocks.roles },
    ],
  })
    .overrideProvider(DB)
    .useValue(fakeDb({}).db)
    .overrideProvider(PERMISSION_RESOLVER)
    .useValue(resolver)
    .overrideProvider(TOKEN_VERIFIER)
    .useValue(verify)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

type Method = 'GET' | 'PATCH' | 'POST' | 'DELETE';

/** One request as `token`; `payload` only for a body. */
export function call(
  app: NestFastifyApplication,
  req: { method: Method; url: string; token: string; payload?: object },
) {
  const headers = { authorization: `Bearer ${req.token}` };
  return app.inject({ method: req.method, url: req.url, headers, payload: req.payload });
}

// RoleSwitchService over the fake DB: a student row, its family and the history tables (all empty).
export const STUDENT = {
  id: 's1',
  guardian_id: 'g1',
  name: 'أحمد',
  contact_is_self: false,
  profile_id: null,
};
export const GUARDIAN = {
  id: 'g1',
  name: 'ولي أمر',
  tz: 'Africa/Cairo',
  phone_e164: '+201000000001',
};
const RECORD_TABLES = [
  'subscriptions',
  'lesson_students',
  'lessons',
  'schedule_rule_students',
  'lesson_reports',
  'lesson_feedback',
  'payment_links',
  'assistant_commissions',
  'course_pauses',
  'student_assistants',
  'student_join_links',
  'lesson_join_links',
  'meeting_invitees',
  'student_merges',
  'google_student_files',
  'google_sync_items',
  'channel_messages',
];
/** Every history table empty, for both checks (before the copy and before the delete). */
export const none = (): Record<string, FakeResult[]> =>
  Object.fromEntries(RECORD_TABLES.map((t) => [t, [{ count: 0 }, { count: 0 }]]));

export function roleSetup(results: Record<string, FakeResult[]>) {
  const fake = fakeDb(results);
  const service = new RoleSwitchService(
    new PeopleEditRepo(fake.db),
    new StudentRecordsRepo(fake.db),
    new AuditService(fake.db),
  );
  return { ...fake, service };
}
export const audits = (t: ReturnType<typeof roleSetup>) =>
  t.calls.filter((c) => c.table === 'audit_log').map((c) => c.args[0]);
