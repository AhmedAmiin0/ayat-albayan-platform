import { describe, expect, it } from 'vitest';
import { AuditService } from '@/common/audit/audit.service';
import { PackageEvents } from '@/common/infra/events/lesson-events';
import type { PushService } from '@/common/push/push.service';
import { readerOf } from '@/common/settings/settings.fakes';
import { fakePolicy } from '@/modules/messaging/notification-rules/policy/policy.fakes';
import { fakeDb } from '@/common/db/testing/fake-db';
import { BalanceRepo } from '@/modules/finance/subscriptions/money/balance.repo';
import { PackagesService } from '@/modules/finance/subscriptions/money/packages.service';
import { StudentRenewal } from '@/modules/finance/subscriptions/student-lifecycle/student-renewal';
import { StudentStatusRepo } from '@/modules/finance/subscriptions/student-lifecycle/student-status.repo';
import { SubscriptionsRepo } from '@/modules/finance/subscriptions/shared/subscriptions.repo';
import { SubscriptionsSettings } from '@/modules/finance/subscriptions/shared/subscriptions.settings';
import { AlertsRepo } from '@/modules/finance/subscriptions/alerts/alerts.repo';
import { SubscriptionAlertsService } from '@/modules/finance/subscriptions/alerts/alerts.service';
import { AlertsEnv } from '@/modules/finance/subscriptions/alerts/alerts.env';

const NOW = new Date('2026-10-02T09:00:00Z');
const ids = (n: number): string[] => Array.from({ length: n }, (_, i) => `s${i}`);

/** n students mid-package: paid, 5 of 8 left, not ended; nothing to write. */
function world(n: number) {
  const students = ids(n);
  const sub = (s: string) => ({
    id: `sub-${s}`, student_id: s, status: 'active', price: 290, currency: 'SAR', lessons_total: 8,
    renews_on: null, starts_on: '2026-09-01', created_at: '2026-09-01T09:00:00Z',
  });
  const balance = (s: string) => ({
    subscription_id: `sub-${s}`, student_id: s, lessons_total: 8, lessons_used: 3, remaining: 5,
    is_last: true, ended_at: null, projected_end_at: null,
  });
  const pay = (s: string) => ({ subscription_id: `sub-${s}`, amount: 290, currency: 'SAR', kind: 'payment' });
  return fakeDb({
    subscriptions: [{ data: students.map(sub) }],
    v_subscription_balance: [{ data: students.map(balance) }],
    payments: [{ data: students.map(pay) }],
    students: [{ data: students.map((id) => ({ id, status: 'active', tz: 'Asia/Riyadh' })) }],
    admin_tasks: [{ data: [] }],
  });
}

function service(t: ReturnType<typeof world>): SubscriptionAlertsService {
  const audit = new AuditService(t.db);
  const subs = new SubscriptionsRepo(t.db);
  const packages = new PackagesService(subs, new BalanceRepo(t.db), audit, new PackageEvents());
  const statuses = new StudentStatusRepo(t.db, audit);
  const renewal = new StudentRenewal(statuses, packages, subs);
  const push = {} as PushService;
  const env = new AlertsEnv(readerOf(SubscriptionsSettings), push, renewal);
  return new SubscriptionAlertsService(packages, new AlertsRepo(t.db, fakePolicy()), env);
}

describe('alerts sweep round trips (BE-07)', () => {
  it('stay the same whether 1 or 60 students are evaluated', async () => {
    const one = world(1);
    const many = world(60);
    expect(await service(one).evaluateStudents(ids(1), { now: NOW, cause: { via: 'sweep' } })).toBe(0);
    expect(await service(many).evaluateStudents(ids(60), { now: NOW, cause: { via: 'sweep' } })).toBe(0);
    expect(many.trips).toEqual(one.trips);
    expect(many.trips).toHaveLength(5);
  });
});
