import { describe, expect, it, vi } from 'vitest';
import type { PackagesService, StudentState } from './packages.service';
import { StudentRenewal, type RenewalCause } from './student-renewal';
import type { StudentStatusQueries } from './student-status.queries';
import type { SubscriptionsQueries } from './subscriptions.queries';

// 2026-10-12 21:30 UTC is already 2026-10-13 in Riyadh (UTC+3), still 2026-10-12 in New York.
const NOW = new Date('2026-10-12T21:30:00Z');

function state(o: { remaining?: number; renews_on?: string | null; paid?: number } = {}): StudentState {
  const row = { id: 'sub1', status: 'active', price: 290, lessons_total: 8, renews_on: o.renews_on ?? null };
  const balance = { remaining: o.remaining ?? 3 };
  return { rows: [row], ctx: { balances: new Map([['sub1', balance]]), paid: new Map([['sub1', o.paid ?? 290]]) } } as unknown as StudentState;
}

function setup(o: { status?: string; tz?: string; last?: unknown; moved?: boolean } = {}) {
  const statuses = {
    student: vi.fn(async () => ({ status: o.status ?? 'active', tz: o.tz ?? 'Asia/Riyadh' })),
    lastStatusChange: vi.fn(async () => o.last ?? null),
    move: vi.fn(async () => o.moved ?? true),
  };
  const packages = { context: vi.fn(async () => state().ctx) };
  const subs = { forStudent: vi.fn(async () => state().rows) };
  const r = new StudentRenewal(statuses as unknown as StudentStatusQueries, packages as unknown as PackagesService, subs as unknown as SubscriptionsQueries);
  return { statuses, r };
}
const run = (t: ReturnType<typeof setup>, s: StudentState, cause: RenewalCause = { via: 'event' }) =>
  t.r.apply({ studentId: 's1', state: s, actorId: null, now: NOW, cause });

describe('StudentRenewal: active ↔ «بانتظار التجديد»', () => {
  it('lessons used up → pending_renewal, audited via subscription_ended (CAS from active)', async () => {
    const t = setup();
    expect(await run(t, state({ remaining: 0 }))).toBe('pending_renewal');
    expect(t.statuses.move).toHaveBeenCalledWith({ studentId: 's1', from: 'active', to: 'pending_renewal' }, { actorId: null, after: { via: 'subscription_ended' } });
  });

  it('the renewal date passed in the student’s tz: Riyadh is already on the 13th, New York still on the 12th', async () => {
    expect(await run(setup({ tz: 'Asia/Riyadh' }), state({ renews_on: '2026-10-12' }))).toBe('pending_renewal');
    expect(await run(setup({ tz: 'America/New_York' }), state({ renews_on: '2026-10-12' }))).toBeNull();
  });

  it('a renewal payment → active, audited with the payment id; any other renewal → subscription_renewed', async () => {
    const t = setup({ status: 'pending_renewal' });
    expect(await run(t, state(), { via: 'payment', paymentId: 'p9' })).toBe('active');
    const after = { via: 'payment', payment_id: 'p9', from: 'pending_renewal', reason: 'payment' };
    expect(t.statuses.move).toHaveBeenCalledWith(expect.anything(), { actorId: null, after });
    await run(t, state());
    expect(t.statuses.move).toHaveBeenLastCalledWith(expect.anything(), { actorId: null, after: { via: 'subscription_renewed' } });
  });

  it('expired → active once a renewal runs again (owner 2026-10-15); expired and still ended → nothing', async () => {
    const t = setup({ status: 'expired' });
    expect(await run(t, state())).toBe('active');
    expect(t.statuses.move).toHaveBeenCalledWith({ studentId: 's1', from: 'expired', to: 'active' }, expect.anything());
    expect(await run(setup({ status: 'expired' }), state({ remaining: 0 }))).toBeNull();
  });

  it('new, trial, pending_subscription, paused and churned are never touched', async () => {
    for (const status of ['new', 'trial', 'pending_subscription', 'paused', 'churned']) {
      const t = setup({ status });
      expect(await run(t, state({ remaining: 0 }))).toBeNull();
      expect(t.statuses.move).not.toHaveBeenCalled();
    }
  });

  it('a CAS miss → null; a running subscription → nothing to do', async () => {
    expect(await run(setup({ moved: false }), state({ remaining: 0 }))).toBeNull();
    const t = setup();
    expect(await run(t, state())).toBeNull();
    expect(t.statuses.move).not.toHaveBeenCalled();
  });

  it('the sweep leaves a status set by hand; an event (money write, lesson change) applies the rule', async () => {
    const manual = { after: { status: 'active' }, at: '2026-10-05T10:00:00Z' };
    const sweep = setup({ last: manual });
    expect(await run(sweep, state({ remaining: 0 }), { via: 'sweep' })).toBeNull();
    expect(sweep.statuses.move).not.toHaveBeenCalled();
    expect(await run(setup({ last: manual }), state({ remaining: 0 }))).toBe('pending_renewal');
  });

  it('the sweep applies when the renewal date passed after the manual change, or the last change was automatic', async () => {
    const manual = { after: { status: 'active' }, at: '2026-10-05T10:00:00Z' };
    expect(await run(setup({ last: manual }), state({ renews_on: '2026-10-10' }), { via: 'sweep' })).toBe('pending_renewal');
    const auto = { after: { status: 'active', via: 'payment' }, at: '2026-10-05T10:00:00Z' };
    expect(await run(setup({ last: auto }), state({ remaining: 0 }), { via: 'sweep' })).toBe('pending_renewal');
  });

  it('ended(): reads the packages and their payments, in the student’s tz', async () => {
    expect(await setup().r.ended('s1', 'Asia/Riyadh', NOW)).toBe(false);
  });
});
