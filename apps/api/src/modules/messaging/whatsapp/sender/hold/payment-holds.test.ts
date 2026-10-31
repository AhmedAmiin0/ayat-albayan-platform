import { describe, expect, it } from 'vitest';
import { dueMessage } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { at, fakeHolds, heldPlan, iso, NOTIFICATIONS, NOW } from './payment-holds.fakes';

// The line hold behind the 131042 probe (docs/12 §3.3): set, defer, 48 h stop, session texts.

const template = (id: string, over = {}) => dueMessage({ id, ...over });
const text = (id: string) => dueMessage({ id, template_key: null, body: 'أهلًا' });
const ago = (min: number) => at(-min).toISOString();

async function held() {
  const h = fakeHolds();
  const probe = template('m-1', { created_at: ago(5 * 60) });
  const plan = await h.holds.probe(heldPlan(iso(330)), { ...NOTIFICATIONS, row: probe, now: NOW });
  return { ...h, plan };
}

describe('PaymentHolds — the probe', () => {
  it('the first line hold is 30 min even when the probe row is 5 h old; it is the probe', async () => {
    const { plan } = await held();
    expect(plan.next_attempt_at).toBe(iso(30));
  });

  it('a session text, or any other failure, sets no line hold', async () => {
    const { holds } = fakeHolds();
    const now = { ...NOTIFICATIONS, now: NOW };
    const plan = heldPlan(iso(30));
    expect(await holds.probe(plan, { ...now, row: text('t-1') })).toBe(plan);
    const failed = { ...plan, status: 'failed' as const, error_code: '131026' };
    expect(await holds.probe(failed, { ...now, row: template('m-1') })).toBe(failed);
    await expect(holds.check(template('m-2'), now)).resolves.toBe('send');
  });

  it('a renewal moves the rows the last hold deferred, in one write', async () => {
    const { holds, repo } = await held();
    const plan = await holds.probe(heldPlan(iso(400)), {
      ...NOTIFICATIONS,
      row: template('m-1'),
      now: at(31),
    });
    expect(plan.next_attempt_at).toBe(iso(91));
    expect(repo.move).toHaveBeenCalledWith({ from: [iso(30), iso(32)], to: iso(93) });
  });
});

describe('PaymentHolds — rows of a held line', () => {
  const now = { ...NOTIFICATIONS, now: at(10) };

  it('a template row is deferred to just after the probe, keeping attempts for the CAS', async () => {
    const { holds, repo } = await held();
    await expect(holds.check(template('m-2', { attempts: 1 }), now)).resolves.toBe('deferred');
    expect(repo.defer).toHaveBeenCalledWith({
      id: 'm-2',
      attempts: 1,
      next: iso(32),
      text: expect.stringContaining('131042'),
    });
  });

  it('a session text is not line-held', async () => {
    const { holds, repo } = await held();
    await expect(holds.check(text('t-1'), now)).resolves.toBe('send');
    expect(repo.defer).not.toHaveBeenCalled();
  });

  it('a row expiring before the hold end goes through as a probe', async () => {
    const { holds } = await held();
    await expect(holds.check(template('m-2', { expires_at: iso(20) }), now)).resolves.toBe('send');
  });

  it('a row due 49 h ago is not deferred (aged); one whose 48 h stop comes first goes through', async () => {
    const { holds, repo } = await held();
    const aged = template('m-2', { created_at: ago(49 * 60) });
    await expect(holds.check(aged, now)).resolves.toBe('aged');
    const old = template('m-3', { scheduled_for: ago(47.8 * 60) });
    await expect(holds.check(old, now)).resolves.toBe('send');
    expect(repo.defer).not.toHaveBeenCalled();
    await holds.check(template('m-4', { scheduled_for: ago(47 * 60) }), now);
    expect(repo.defer).toHaveBeenCalledWith(expect.objectContaining({ id: 'm-4', next: iso(32) }));
  });

  it('bulk: the pass rest is deferred in ONE write after the probe; text and capped rows left', async () => {
    const { holds, repo } = await held();
    const rows = [template('m-2'), text('t-1'), template('m-3', { expires_at: iso(31) }), template('m-4')];
    await holds.deferRest(rows, now);
    expect(repo.deferMany).toHaveBeenCalledTimes(1);
    expect(repo.deferMany).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ['m-2', 'm-4'], next: iso(32) }),
    );
  });

  it('bulk on a line that is not held (a token pause) writes nothing', async () => {
    const { holds, repo } = fakeHolds();
    await holds.deferRest([template('m-2')], now);
    expect(repo.deferMany).not.toHaveBeenCalled();
  });
});

describe('PaymentHolds — lift', () => {
  it('a sent row lifts the hold and frees its deferred rows now; then rows send at once', async () => {
    const { holds, repo } = await held();
    await holds.lift({ ...NOTIFICATIONS, now: at(5) });
    expect(repo.move).toHaveBeenCalledWith({ from: [iso(30), iso(32)], to: iso(5) });
    await expect(holds.check(template('m-2'), { ...NOTIFICATIONS, now: at(6) })).resolves.toBe(
      'send',
    );
  });

  it('nothing held: no write; a failed write never throws', async () => {
    const { holds, repo } = await held();
    await holds.lift({ line: 'chat', now: at(5) });
    expect(repo.move).not.toHaveBeenCalled();
    repo.move.mockRejectedValueOnce(new Error('db down'));
    await expect(holds.lift({ ...NOTIFICATIONS, now: at(5) })).resolves.toBeUndefined();
  });
});
