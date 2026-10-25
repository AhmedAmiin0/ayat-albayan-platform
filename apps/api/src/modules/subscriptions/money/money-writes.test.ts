import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../common/audit/audit.service';
import type { SubscriptionAlertsService } from '../alerts/alerts.service';
import type { MoneyFollowUps } from './money-follow-ups';
import { causeOf, MoneyWrites } from './money-writes';

function setup() {
  const order: string[] = [];
  const audit = { record: vi.fn(async () => void order.push('audit')) };
  const alerts = { evaluateStudents: vi.fn(async () => void order.push('evaluate')), closeTasksOf: vi.fn() };
  const follow = { after: vi.fn(async () => void order.push('follow')) };
  const w = new MoneyWrites(audit as unknown as AuditService, alerts as unknown as SubscriptionAlertsService, follow as unknown as MoneyFollowUps);
  return { order, audit, alerts, follow, w };
}
const CREATE = { actorId: 'a1', entity: 'payments', entityId: 'p1', action: 'create', after: { kind: 'payment', amount: 290 } };

describe('MoneyWrites: audit → follow-ups (flip / revert) → recompute + the renewal rule', () => {
  it('runs in that order, the payment id as the renewal cause', async () => {
    const t = setup();
    await t.w.done(CREATE, 's1');
    expect(t.order).toEqual(['audit', 'follow', 'evaluate']);
    expect(t.follow.after).toHaveBeenCalledWith(CREATE, { studentId: 's1', actorId: 'a1' });
    expect(t.alerts.evaluateStudents).toHaveBeenCalledWith(['s1'], { actorId: 'a1', cause: { via: 'payment', paymentId: 'p1' } });
  });

  it('a replayed payment form re-runs the follow-ups and the recompute, never a second audit row', async () => {
    const t = setup();
    await t.w.replayed(CREATE, 's1');
    expect(t.order).toEqual(['follow', 'evaluate']);
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('no student → only the audit', async () => {
    const t = setup();
    await t.w.done(CREATE, null);
    await t.w.replayed(CREATE, null);
    expect(t.order).toEqual(['audit']);
  });

  it('causeOf: only a positive payment create carries its id', () => {
    expect(causeOf(CREATE)).toEqual({ via: 'payment', paymentId: 'p1' });
    expect(causeOf({ ...CREATE, after: { kind: 'refund', amount: 1 } })).toEqual({ via: 'event' });
    expect(causeOf({ ...CREATE, action: 'delete' })).toEqual({ via: 'event' });
    expect(causeOf({ ...CREATE, entity: 'subscriptions' })).toEqual({ via: 'event' });
  });
});
