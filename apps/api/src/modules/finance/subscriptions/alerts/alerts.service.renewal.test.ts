import { describe, expect, it, vi } from 'vitest';
import { readerOf } from '../../../../common/settings/settings.fakes';
import type { AlertsQueries } from './alerts.queries';
import { SubscriptionAlertsService, type AlertsEnv } from './alerts.service';
import type { PackagesService, StudentState } from '../money/packages.service';
import { SubscriptionsSettings } from '../subscriptions.settings';

const NOW = new Date('2026-10-02T09:00:00Z');
const STATE = { rows: [], ctx: { balances: new Map(), paid: new Map() } } as unknown as StudentState;

function setup(fail = false) {
  const packages = { recompute: vi.fn(async () => STATE) };
  const queries = { closeTasks: vi.fn(async () => undefined) };
  const settings = readerOf(SubscriptionsSettings);
  const renewal = { apply: vi.fn(async () => (fail ? Promise.reject(new Error('boom')) : null)) };
  const env = { settings, push: {}, renewal } as unknown as AlertsEnv;
  const service = new SubscriptionAlertsService(packages as unknown as PackagesService, queries as unknown as AlertsQueries, env);
  return { service, renewal };
}

describe('evaluateStudents → the «بانتظار التجديد» rule after the recompute (docs/11 §7)', () => {
  it('passes the recomputed state, the actor and the cause', async () => {
    const t = setup();
    await t.service.evaluateStudents(['s1'], { now: NOW, actorId: 'a1', cause: { via: 'payment', paymentId: 'p1' } });
    expect(t.renewal.apply).toHaveBeenCalledWith({ studentId: 's1', state: STATE, actorId: 'a1', now: NOW, cause: { via: 'payment', paymentId: 'p1' } });
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
});
