// HTTP test harness for the money controllers (test-only, excluded from the build). Real
// controllers, guards and services; every DB / storage / pricing facing class is a mock.
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { AuditService } from '../../common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { SettingsService } from '../../common/settings/settings.service';
import { StorageService } from '../../common/storage/storage.service';
import { ExpensesQueries } from '../expenses/expenses.queries';
import { FxService } from '../fx/fx.service';
import { InvoicesQueries } from '../invoices/invoices.queries';
import { PaymentsQueries } from '../payments/payments.queries';
import { PayoutsQueries } from '../payouts/payouts.queries';
import { CorrectionsQueries } from '../teacher-earnings/corrections.queries';
import { EarningsQueries } from '../teacher-earnings/earnings.queries';
import { PricingService } from '../pricing/pricing.service';
import { SalesQueries } from '../sales/sales.queries';
import { SalesFamilyQueries } from '../sales-money/sales-family.queries';
import { InboundMedia } from '../whatsapp/inbound-media.service';
import { InboundMediaQueries } from '../whatsapp/inbound-media.queries';
import { TeachersQueries } from '../teachers/teachers.queries';
import { AdminTasksQueries } from './admin-tasks.queries';
import { AlertsQueries } from './alerts.queries';
import { BalanceQueries } from './balance.queries';
import { LeadConversion } from './lead-conversion';
import { StudentAccess } from './student-access';
import { StudentActivation } from './student-activation';
import { SubscriptionsQueries } from './subscriptions.queries';
import { mocks } from './test-app.fakes';

export { resetMocks, type Mocks } from './test-app.fakes';

export const ADMIN: AuthUser = { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' };
export const TEACHER: AuthUser = { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' };
export const SALES_A: AuthUser = { id: 'a1000000-0000-4000-8000-00000000000a', email: null, role: 'sales' };
export const SALES_B: AuthUser = { id: 'b1000000-0000-4000-8000-00000000000b', email: null, role: 'sales' };
const USERS: Record<string, AuthUser> = { admin: ADMIN, teacher: TEACHER, salesA: SALES_A, salesB: SALES_B };
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

export type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export type InjectArgs = { method: Method; url: string; token?: 'admin' | 'teacher' | 'salesA' | 'salesB'; body?: object };

/** Boots AppModule with the mocks; `call` defaults to the admin token. */
export async function moneyApp() {
  const m = mocks();
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(SubscriptionsQueries).useValue(m.subs)
    .overrideProvider(BalanceQueries).useValue(m.balances)
    .overrideProvider(LeadConversion).useValue(m.leads)
    .overrideProvider(StudentActivation).useValue(m.activation)
    .overrideProvider(AlertsQueries).useValue(m.alerts)
    .overrideProvider(AdminTasksQueries).useValue(m.tasks)
    .overrideProvider(PaymentsQueries).useValue(m.payments)
    .overrideProvider(PayoutsQueries).useValue(m.payouts)
    .overrideProvider(EarningsQueries).useValue(m.earnings)
    .overrideProvider(CorrectionsQueries).useValue(m.corrections)
    .overrideProvider(ExpensesQueries).useValue(m.expenses)
    .overrideProvider(FxService).useValue(m.fx)
    .overrideProvider(InvoicesQueries).useValue(m.invoices)
    .overrideProvider(TeachersQueries).useValue(m.teachers)
    .overrideProvider(StudentAccess).useValue(m.access)
    .overrideProvider(AuditService).useValue(m.audit)
    .overrideProvider(SettingsService).useValue(m.settings)
    .overrideProvider(StorageService).useValue(m.storage)
    .overrideProvider(PricingService).useValue(m.pricing)
    .overrideProvider(SalesQueries).useValue(m.sales)
    .overrideProvider(SalesFamilyQueries).useValue(m.family)
    .overrideProvider(InboundMedia).useValue(m.media)
    .overrideProvider(InboundMediaQueries).useValue(m.mediaQueries)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = ({ method, url, token = 'admin', body }: InjectArgs) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, payload: body });
  return { app, m, call };
}
