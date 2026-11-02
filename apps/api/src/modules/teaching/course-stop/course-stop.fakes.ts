// HTTP harness of «إلغاء الاشتراك» (test-only, excluded from the build by *.fakes.ts).
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '@/app.module';
import { bootWith, ROLE_ADMIN, ROLE_SALES, ROLE_USERS } from '@/common/auth/auth.fakes';
import { notFound } from '@/common/http/errors';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { SettingsService } from '@/common/settings/settings.service';
import { MoneyWrites } from '@/modules/finance/subscriptions';
import { LessonEvents } from '@/common/infra/events/lesson-events';
import { AuditService } from '@/common/audit/audit.service';
import { PushService } from '@/common/push/push.service';
import { PaymentsService } from '@/modules/finance/payments';
import { StripeClients } from '@/modules/finance/stripe';
import { CourseStopRepo, type StopSub } from './course-stop.repo';
import { StopRefundRepo } from './refund';

export const STUDENT = '5a000000-0000-4000-8000-0000000000a1';
export const SUB = 'b0000000-0000-4000-8000-0000000000b1';
export const REQ = 'e0000000-0000-4000-8000-0000000000e1';
export const ADMIN = ROLE_ADMIN;
export const SALES = ROLE_SALES;
export const NOW = new Date('2026-10-30T09:00:00Z');

/** A paid, half-used package of STUDENT. */
const subRow = (over: Partial<StopSub> = {}): StopSub => ({
  id: SUB,
  student_id: STUDENT,
  status: 'active',
  currency: 'SAR',
  cancelled_at: null,
  cancelled_by: null,
  cancel_reason: null,
  ...over,
});
export const stamped = subRow({
  status: 'cancelled',
  cancelled_at: NOW.toISOString(),
  cancelled_by: SALES,
  cancel_reason: 'سفر',
});

/** stop_course's answer to a first stop: 2 rules ended, 3 lessons cancelled, student churned. */
export const STOPPED = {
  cancelled_lessons: ['l1', 'l2', 'l3'],
  ended_rules: ['r1', 'r2'],
  student_status: 'churned',
  stopped_at: '2026-10-30T09:00:00+00:00',
  replayed: false,
};

function mocks() {
  return {
    repo: { current: vi.fn(), subscription: vi.fn(), plan: vi.fn(), paid: vi.fn(), stop: vi.fn() },
    writes: { recorded: vi.fn() },
    events: { changed: vi.fn(), onChanged: vi.fn(), onScheduleChange: vi.fn() },
    refunds: { pkg: vi.fn(), money: vi.fn(), intents: vi.fn() },
    stripe: { refunds: { list: vi.fn(), create: vi.fn() } },
    clients: { client: vi.fn() },
    payments: { create: vi.fn() },
    push: { notifyAdmins: vi.fn() },
    audit: { record: vi.fn() },
  };
}

/** A bank payment of 290 SAR (the package: 400 SAR, 8 lessons, 3 used → 140 refundable). */
export const bankRow = (over: object = {}) => ({
  id: 'p-bank',
  amount: 290,
  kind: 'payment',
  method: 'bank',
  currency: 'SAR',
  original_amount: null,
  original_currency: null,
  client_request_id: null,
  ...over,
});

function reset(m: ReturnType<typeof mocks>): void {
  vi.resetAllMocks();
  m.repo.subscription.mockImplementation(async (_id: string, studentId: string) => {
    if (studentId !== STUDENT) throw notFound('subscription_not_found');
    return subRow();
  });
  m.repo.plan.mockResolvedValue({
    rule_ids: ['r1', 'r2'],
    lessons: [{ id: 'l1', status: 'scheduled' }],
    unattributed: false,
  });
  m.repo.current.mockResolvedValue(subRow());
  m.repo.paid.mockResolvedValue(290);
  m.repo.stop.mockResolvedValue(STOPPED);
  m.writes.recorded.mockResolvedValue(undefined);
  m.events.changed.mockResolvedValue(undefined);
  const created = (w: { amount: number }) => Promise.resolve({ amount: w.amount });
  m.payments.create.mockImplementation(created);
  m.refunds.pkg.mockResolvedValue({ price: 400, lessonsTotal: 8, attended: 3, studentName: 'ط' });
  m.refunds.money.mockResolvedValue([bankRow()]);
  m.refunds.intents.mockResolvedValue(new Map());
  m.stripe.refunds.list.mockReturnValue({ autoPagingToArray: () => Promise.resolve([]) });
  m.stripe.refunds.create.mockResolvedValue({ id: 're_new' });
  m.clients.client.mockResolvedValue(m.stripe);
}

export async function stopApp() {
  const m = mocks();
  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(SettingsService)
    .useValue(fakeSettings({}))
    .overrideProvider(CourseStopRepo)
    .useValue(m.repo)
    .overrideProvider(LessonEvents)
    .useValue(m.events)
    .overrideProvider(MoneyWrites)
    .useValue(m.writes)
    .overrideProvider(StopRefundRepo)
    .useValue(m.refunds)
    .overrideProvider(StripeClients)
    .useValue(m.clients)
    .overrideProvider(PaymentsService)
    .useValue(m.payments)
    .overrideProvider(PushService)
    .useValue(m.push)
    .overrideProvider(AuditService)
    .useValue(m.audit);
  const app = await bootWith(builder, ROLE_USERS);
  const call = (input: { method: 'GET' | 'POST'; url: string; token: string; body?: object }) =>
    app.inject({
      method: input.method,
      url: input.url,
      payload: input.body,
      headers: { authorization: `Bearer ${input.token}` },
    });
  return { app, m, call, reset: () => reset(m) };
}
