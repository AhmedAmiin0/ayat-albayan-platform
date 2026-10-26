// Test fixtures and HTTP harness for the sales module (test-only, excluded from the build by *.fakes.ts).
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../app.module';
import { AuditService } from '../../common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { SalesAssignQueries } from './assign/sales-assign.queries';
import type { SalesLessonRow } from './schedule/sales-lessons';
import type { SalesOwnership } from './sales-ownership';
import { SalesQueries, type SalesSubscriptionRow } from './sales.queries';
import { fakeSettings } from '../../common/settings/settings.fakes';
import { SettingsService } from '../../common/settings/settings.service';

export const A = 'a1000000-0000-4000-8000-00000000000a';
export const B = 'b1000000-0000-4000-8000-00000000000b';
const USERS: Record<string, AuthUser> = {
  salesA: { id: A, email: null, role: 'sales' },
  salesB: { id: B, email: null, role: 'sales' },
  admin: { id: 'ad000000-0000-4000-8000-0000000000ad', email: null, role: 'admin' },
  teacher: { id: 't1', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

/** A owns lead l1 -> guardian g1 -> student s1; B owns nothing. */
export const OWN_A: SalesOwnership = { leadIds: ['l1'], guardianIds: ['g1'], studentIds: ['s1'], phones: ['+966551110000'] };
export const NONE: SalesOwnership = { leadIds: [], guardianIds: [], studentIds: [], phones: [] };

/** A row as the database returns it: with every money column present, so a test can prove they never leave. */
export const dirtySubscription = (over: Partial<SalesSubscriptionRow> = {}): SalesSubscriptionRow =>
  ({
    id: 'sub-1', package: '8', status: 'unpaid', starts_on: '2026-10-01', lessons_total: 8,
    student: { id: 's1', code: 'AB-0101', name: 'ياسمين' },
    price: 290, currency: 'SAR', fx_rate: 3.75, fx_date: '2026-10-01', price_source: 'tier', notes: 'سر', payments: [{ amount: 100 }],
    ...over,
  }) as SalesSubscriptionRow;

export const meetingRow = (over: Partial<SalesLessonRow> = {}): SalesLessonRow => ({
  id: 'les-1',
  starts_at: '2026-10-05T16:00:00.000Z',
  ends_at: '2026-10-05T16:30:00.000Z',
  status: 'scheduled',
  teacher: { display_name_ar: 'أبرار' },
  rule: { created_from_lead_id: 'l1', package: 'trial', lead: { name: 'أم ياسمين' } },
  lesson_students: [{ student_id: 's1', student: { name: 'ياسمين' } }],
  ...over,
});

export async function salesApp() {
  const sales = { ownership: vi.fn(), subscriptions: vi.fn(), meetings: vi.fn(), ownsLesson: vi.fn() };
  const assign = {
    salespeople: vi.fn(), assignedLeads: vi.fn(), unassignedLeadIds: vi.fn(),
    isSalesperson: vi.fn(), setAssignee: vi.fn(), names: vi.fn(),
  };
  const audit = { record: vi.fn() };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(SalesQueries).useValue(sales)
    .overrideProvider(SalesAssignQueries).useValue(assign)
    .overrideProvider(AuditService).useValue(audit)
    .overrideProvider(SettingsService).useValue(fakeSettings())
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = (input: { method: 'GET' | 'POST'; url: string; token: keyof typeof USERS; body?: object }) =>
    app.inject({ method: input.method, url: input.url, headers: { authorization: `Bearer ${input.token}` }, payload: input.body });
  return { app, call, sales, assign, audit };
}
