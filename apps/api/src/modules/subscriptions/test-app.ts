// HTTP test harness for the money controllers (test-only, excluded from the build). Real
// controllers, guards and services; every DB / storage / pricing facing class is a mock.
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../app.module';
import { AuditService } from '../../common/audit/audit.service';
import { TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { SettingsService } from '../../common/settings/settings.service';
import { SETTING_DEFAULTS } from '../../common/settings/settings.values';
import { StorageService } from '../../common/storage/storage.service';
import { ExpensesQueries } from '../expenses/expenses.queries';
import { PaymentsQueries } from '../payments/payments.queries';
import { PayoutsQueries } from '../payouts/payouts.queries';
import { PricingService } from '../pricing/pricing.service';
import { TeachersQueries } from '../teachers/teachers.queries';
import { AdminTasksQueries } from './admin-tasks.queries';
import { AlertsQueries } from './alerts.queries';
import { BalanceQueries } from './balance.queries';
import { LeadConversion } from './lead-conversion';
import { StudentAccess } from './student-access';
import { SubscriptionsQueries } from './subscriptions.queries';

export const ADMIN: AuthUser = { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' };
export const TEACHER: AuthUser = { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' };
const USERS: Record<string, AuthUser> = { admin: ADMIN, teacher: TEACHER };
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

export type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export type InjectArgs = { method: Method; url: string; token?: 'admin' | 'teacher'; body?: object };

function mocks() {
  return {
    subs: {
      list: vi.fn(), get: vi.fn(), forStudent: vi.fn(), forStudents: vi.fn(), insert: vi.fn(),
      update: vi.fn(), remove: vi.fn(), hasPayments: vi.fn(), paid: vi.fn(), studentForQuote: vi.fn(),
      byRequest: vi.fn(),
    },
    leads: { afterPackage: vi.fn() },
    balances: { forSubscriptions: vi.fn(), forStudents: vi.fn() },
    alerts: {
      studentsOfLessons: vi.fn(), studentsWithPackages: vi.fn(), raiseTask: vi.fn(), recipient: vi.fn(),
      queueRenewal: vi.fn(), closeTasks: vi.fn(),
    },
    tasks: { list: vi.fn(), done: vi.fn() },
    payments: {
      list: vi.fn(), get: vi.fn(), insert: vi.fn(), update: vi.fn(), remove: vi.fn(), subscription: vi.fn(),
      recorders: vi.fn(), byRequest: vi.fn(),
    },
    payouts: {
      teachers: vi.fn(), lessons: vi.fn(), forMonth: vi.fn(), forTeacher: vi.fn(), get: vi.fn(),
      insert: vi.fn(), update: vi.fn(), removeDraft: vi.fn(), pendingReports: vi.fn(), editedSince: vi.fn(),
    },
    expenses: { forMonth: vi.fn(), get: vi.fn(), insert: vi.fn(), update: vi.fn(), remove: vi.fn() },
    teachers: { idByProfile: vi.fn() },
    access: { check: vi.fn() },
    audit: { record: vi.fn() },
    settings: { all: vi.fn(), lateCancelHours: vi.fn(), bookingHorizonWeeks: vi.fn() },
    storage: { signedUpload: vi.fn(), signedDownload: vi.fn(), exists: vi.fn(), remove: vi.fn() },
    pricing: { quote: vi.fn(), catalog: vi.fn() },
  };
}
export type Mocks = ReturnType<typeof mocks>;

/** Defaults: an empty student, no payments, default settings. Call in beforeEach. */
export function resetMocks(m: Mocks): void {
  for (const group of Object.values(m)) for (const fn of Object.values(group)) fn.mockReset();
  m.subs.forStudent.mockResolvedValue([]);
  m.subs.forStudents.mockResolvedValue([]);
  m.subs.paid.mockResolvedValue(new Map());
  m.balances.forSubscriptions.mockResolvedValue(new Map());
  m.balances.forStudents.mockResolvedValue([]);
  m.payments.recorders.mockResolvedValue(new Map());
  m.payouts.pendingReports.mockResolvedValue(0);
  m.payouts.editedSince.mockResolvedValue(0);
  m.payments.byRequest.mockResolvedValue(null);
  m.subs.byRequest.mockResolvedValue(null);
  m.settings.all.mockResolvedValue(SETTING_DEFAULTS);
  m.storage.remove.mockResolvedValue(undefined);
}

/** Boots AppModule with the mocks; `call` defaults to the admin token. */
export async function moneyApp() {
  const m = mocks();
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(SubscriptionsQueries).useValue(m.subs)
    .overrideProvider(BalanceQueries).useValue(m.balances)
    .overrideProvider(LeadConversion).useValue(m.leads)
    .overrideProvider(AlertsQueries).useValue(m.alerts)
    .overrideProvider(AdminTasksQueries).useValue(m.tasks)
    .overrideProvider(PaymentsQueries).useValue(m.payments)
    .overrideProvider(PayoutsQueries).useValue(m.payouts)
    .overrideProvider(ExpensesQueries).useValue(m.expenses)
    .overrideProvider(TeachersQueries).useValue(m.teachers)
    .overrideProvider(StudentAccess).useValue(m.access)
    .overrideProvider(AuditService).useValue(m.audit)
    .overrideProvider(SettingsService).useValue(m.settings)
    .overrideProvider(StorageService).useValue(m.storage)
    .overrideProvider(PricingService).useValue(m.pricing)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = ({ method, url, token = 'admin', body }: InjectArgs) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, payload: body });
  return { app, m, call };
}
