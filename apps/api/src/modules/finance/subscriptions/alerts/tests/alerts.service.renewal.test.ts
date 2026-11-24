import { describe, expect, it, vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import type { AlertsRepo } from '@/modules/finance/subscriptions/alerts/alerts.repo';
import { SubscriptionAlertsService, type AlertsEnv } from '@/modules/finance/subscriptions/alerts/alerts.service';
import type { PackagesService, StudentState } from '@/modules/finance/subscriptions/money/packages.service';
import { SubscriptionsSettings } from '@/modules/finance/subscriptions/shared/subscriptions.settings';

const NOW = new Date('2026-10-02T09:00:00Z');
const CTX = { balances: new Map(), paid: new Map() };
const STATE = { rows: [], ctx: CTX } as unknown as StudentState;

const STUDENT = { status: 'active', tz: 'Asia/Riyadh' };
const OPEN = [{ subject_id: 'sub-1', dedup_key: 'renewal_due:sub-1' }];

function setup(fail = false) {
  const rows = [{ id: 'sub-1', status: 'active', price: 145, lessons_total: 8, student_id: 's1' }];
  const state = { ...STATE, rows } as unknown as StudentState;
  const each = <T>(v: T) => async (ids: string[]) => new Map(ids.map((id) => [id, v]));
  const packages = { recomputeMany: vi.fn(each(state)) };
  const queries = { openTasks: vi.fn(async () => OPEN), closeKeys: vi.fn(async () => undefined) };
  const settings = readerOf(SubscriptionsSettings);
  const apply = async () => (fail ? Promise.reject(new Error('boom')) : null);
  const renewal = { apply: vi.fn(apply), students: vi.fn(each(STUDENT)) };
  const env = { settings, push: {}, renewal } as unknown as AlertsEnv;
  const service = new SubscriptionAlertsService(
    packages as unknown as PackagesService,
    queries as unknown as AlertsRepo,
    env,
  );
  return { service, renewal, packages, queries, state };
}

describe('evaluateStudents → the «بانتظار التجديد» rule after the recompute (docs/11 §7)', () => {
  it('passes the recomputed state, the actor and the cause', async () => {
    const t = setup();
    await t.service.evaluateStudents(['s1'], { now: NOW, actorId: 'a1', cause: { via: 'payment', paymentId: 'p1' } });
    const cause = { via: 'payment', paymentId: 'p1' };
    expect(t.renewal.apply).toHaveBeenCalledWith({ studentId: 's1', student: STUDENT, state: t.state, actorId: 'a1', now: NOW, cause });
  });

  it('a lesson change (no cause) is an event, with no actor', async () => {
    const t = setup();
    await t.service.evaluateStudents(['s1'], { now: NOW });
    expect(t.renewal.apply).toHaveBeenCalledWith(expect.objectContaining({ actorId: null, cause: { via: 'event' } }));
  });

  it('a failure counts as a failed student and never stops the others', async () => {
    const t = setup(true);
    expect(await t.service.evaluateStudents(['s1', 's2'], { now: NOW })).toBe(2);
    expect(t.renewal.apply).toHaveBeenCalledTimes(2);
  });

  it('a failed student keeps its open tasks; the others close theirs', async () => {
    const t = setup(true);
    await t.service.evaluateStudents(['s1'], { now: NOW });
    expect(t.queries.closeKeys).toHaveBeenCalledWith([], NOW);
  });

  it('a failed batch read counts every student as failed and never throws', async () => {
    const t = setup();
    vi.mocked(t.packages.recomputeMany).mockRejectedValueOnce(new Error('db down'));
    expect(await t.service.evaluateStudents(['s1', 's2'], { now: NOW })).toBe(2);
    expect(t.renewal.apply).not.toHaveBeenCalled();
  });

  it('a student whose task is no longer called for has it closed', async () => {
    const t = setup();
    await t.service.evaluateStudents(['s1'], { now: NOW });
    expect(t.queries.closeKeys).toHaveBeenCalledWith(['renewal_due:sub-1'], NOW);
  });
});
