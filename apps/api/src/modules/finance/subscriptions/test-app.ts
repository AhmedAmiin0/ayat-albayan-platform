// HTTP test harness for the money controllers (test-only, excluded from the build). Real
// controllers, guards and services; every DB / storage / pricing facing class is a mock.
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { AuditService } from '@/common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '@/common/auth/auth.guard';
import type { PermissionResolver } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { SettingsService } from '@/common/settings/settings.service';
import { StorageService } from '@/common/storage/storage.service';
import { ExpensesRepo } from '@/modules/finance/expenses/expenses.repo';
import { FxService } from '@/modules/finance/fx/fx.service';
import { InvoicesRepo } from '@/modules/finance/invoices/invoices.repo';
import { PaymentAttachmentsRepo } from '@/modules/finance/payments/attachments/payment-attachments.repo';
import { PaymentsRepo } from '@/modules/finance/payments/payments.repo';
import { PaymentReceivedRepo } from '@/modules/finance/payments/received/payment-received.repo';
import { PayoutsRepo } from '@/modules/finance/payouts/payouts.repo';
import { CorrectionsRepo } from '@/modules/finance/teacher-earnings/summary/corrections.repo';
import { EarningsRepo } from '@/modules/finance/teacher-earnings/earnings.repo';
import { PricingService } from '@/modules/finance/pricing/pricing.service';
import { SalesRepo } from '@/modules/sales/sales/sales.repo';
import { SalesFamilyRepo } from '@/modules/sales/sales-money/reads/sales-family.repo';
import { InboundMedia } from '@/modules/messaging/whatsapp/messages/inbound-media.service';
import { InboundMediaRepo } from '@/modules/messaging/whatsapp/messages/inbound-media.repo';
import { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import { AdminTasksRepo } from './alerts/admin-tasks.repo';
import { SubscriptionCancelRepo } from './cancel/subscription-cancel.repo';
import { AlertsRepo } from './alerts/alerts.repo';
import { BalanceRepo } from './money/balance.repo';
import { CommissionBell } from './money/commission-bell';
import { LeadConversion } from './student-lifecycle/lead-conversion';
import { StudentAccess } from './student-lifecycle/student-access';
import { StudentActivation } from './student-lifecycle/student-activation';
import { StudentStatusRepo } from './student-lifecycle/student-status.repo';
import { StudentTrialRepo } from './trial/student-trial.repo';
import { SubscriptionsRepo } from './subscriptions.repo';
import { mocks } from './test-app.fakes';

export { ENFORCED_SETTINGS, resetMocks, type Mocks } from './test-app.fakes';

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

/**
 * Boots AppModule with the mocks; `call` defaults to the admin token. `resolver`: e.g. a role minus one key;
 * `more`: a module's own overrides on top (the Stripe module's queries and client).
 */
export async function moneyApp(resolver: PermissionResolver = systemResolver, more: (b: TestingModuleBuilder) => TestingModuleBuilder = (b) => b) {
  const m = mocks();
  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(resolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(SubscriptionsRepo).useValue(m.subs)
    .overrideProvider(SubscriptionCancelRepo).useValue(m.cancels)
    .overrideProvider(BalanceRepo).useValue(m.balances)
    .overrideProvider(LeadConversion).useValue(m.leads)
    .overrideProvider(StudentActivation).useValue(m.activation)
    .overrideProvider(CommissionBell).useValue(m.commissionBell)
    .overrideProvider(StudentStatusRepo).useValue(m.statuses)
    .overrideProvider(StudentTrialRepo).useValue(m.trials)
    .overrideProvider(AlertsRepo).useValue(m.alerts)
    .overrideProvider(AdminTasksRepo).useValue(m.tasks)
    .overrideProvider(PaymentsRepo).useValue(m.payments)
    .overrideProvider(PaymentReceivedRepo).useValue(m.received)
    .overrideProvider(PaymentAttachmentsRepo).useValue(m.attachments)
    .overrideProvider(PayoutsRepo).useValue(m.payouts)
    .overrideProvider(EarningsRepo).useValue(m.earnings)
    .overrideProvider(CorrectionsRepo).useValue(m.corrections)
    .overrideProvider(ExpensesRepo).useValue(m.expenses)
    .overrideProvider(FxService).useValue(m.fx)
    .overrideProvider(InvoicesRepo).useValue(m.invoices)
    .overrideProvider(TeachersRepo).useValue(m.teachers)
    .overrideProvider(StudentAccess).useValue(m.access)
    .overrideProvider(AuditService).useValue(m.audit)
    .overrideProvider(SettingsService).useValue(m.settings)
    .overrideProvider(StorageService).useValue(m.storage)
    .overrideProvider(PricingService).useValue(m.pricing)
    .overrideProvider(SalesRepo).useValue(m.sales)
    .overrideProvider(SalesFamilyRepo).useValue(m.family)
    .overrideProvider(InboundMedia).useValue(m.media)
    .overrideProvider(InboundMediaRepo).useValue(m.mediaQueries);
  const mod = await more(builder).compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { rawBody: true }); // as main.ts
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = ({ method, url, token = 'admin', body }: InjectArgs) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, payload: body });
  return { app, m, call };
}
