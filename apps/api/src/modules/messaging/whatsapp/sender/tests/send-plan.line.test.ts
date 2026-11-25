import { describe, expect, it } from 'vitest';
import { errorFor } from '@/common/infra/http/errors';
import type { HttpFailure } from '@/common/infra/http/failure';
import type { GraphEnv } from '@/config/env/env';
import { crmErrorFrom, crmJson } from '@/modules/messaging/whatsapp/drivers/crm/crm-http';
import { evolutionTable } from '@/modules/messaging/whatsapp/drivers/evolution/evolution-errors';
import { byDriver, PLAIN } from '@/modules/messaging/whatsapp/drivers/meta/graph-errors';
import { WA_LINE_DOWN } from '@/modules/messaging/whatsapp/sender/hold/line-down';
import { failurePlan, UNCERTAIN } from '@/modules/messaging/whatsapp/sender/send-plan';

// A line-level failure (the provider down or unreachable) holds the lane with the try uncounted;
// a timeout stays uncertain; Meta's own codes keep their per-message retries (docs/12 §3.3).

const NOW = new Date('2026-11-22T08:00:00Z');
const where = 'whatsapp POST /messages';
const status = (code: number, body: unknown = null, text = ''): HttpFailure =>
  ({ kind: 'status', status: code, body, text, retryAfter: null, where });
const REFUSED: HttpFailure = { kind: 'network', reached: false, where };
const DROPPED: HttpFailure = { kind: 'network', reached: true, where };
const TIMEOUT: HttpFailure = { kind: 'timeout', where };
const statusOf = (f: HttpFailure) =>
  f.kind === 'status' ? { status: f.status, text: f.text } : { status: 0, text: '' };
const KAPSO = { provider: 'kapso' } as unknown as GraphEnv;
const metaCode = (code: number) => ({ error: { code, message: `(#${code}) Meta` } });

const DRIVERS = {
  meta: (f: HttpFailure) => errorFor(PLAIN, f),
  kapso: (f: HttpFailure) => byDriver(KAPSO, errorFor(PLAIN, f)),
  evolution: (f: HttpFailure) => errorFor(evolutionTable({ sent: true, cloud: false }), f),
  crm: (f: HttpFailure) => crmErrorFrom({ ...statusOf(f), retryAfter: null }),
};
type Driver = keyof typeof DRIVERS;

const planOf = (driver: Driver, f: HttpFailure, attempts = 2) =>
  failurePlan({ error: DRIVERS[driver](f), attempts, now: NOW });

const HELD = { status: 'queued', error_code: WA_LINE_DOWN, attempts: 1 };
const UNSURE = { status: 'failed', error_code: UNCERTAIN, next_attempt_at: null };
const envelope = (code: string) => JSON.stringify({ error: { code, message: 'CRM said' } });

const CASES: readonly [string, Driver, HttpFailure, object][] = [
  ['meta: 503 with no Meta code', 'meta', status(503), HELD],
  ['meta: 500 with no Meta code', 'meta', status(500), HELD],
  ['meta: a refused connection', 'meta', REFUSED, HELD],
  ['meta: a dropped connection', 'meta', DROPPED, UNSURE],
  ['meta: a timeout', 'meta', TIMEOUT, UNSURE],
  ['kapso: 503 with no Meta code', 'kapso', status(503), HELD],
  ['kapso: a refused connection', 'kapso', REFUSED, HELD],
  ['kapso: a timeout', 'kapso', TIMEOUT, UNSURE],
  ['meta: a gateway 502 (it may have passed it on)', 'meta', status(502, null, '<html>'), UNSURE],
  ['meta: a gateway 504 (it may have passed it on)', 'meta', status(504, null, '<html>'), UNSURE],
  ['kapso: a gateway 502 (it may have passed it on)', 'kapso', status(502, null, '<html>'), UNSURE],
  ['kapso: a gateway 504 (it may have passed it on)', 'kapso', status(504, null, '<html>'), UNSURE],
  ['crm: a non-envelope 503', 'crm', status(503, null, '<html>down</html>'), HELD],
  ['crm: a non-envelope 502', 'crm', status(502, null, '<html>bad</html>'), UNSURE],
  ['crm: a non-envelope 504', 'crm', status(504, null, '<html>late</html>'), UNSURE],
  ['crm: an envelope 503', 'crm', status(503, null, envelope('internal')), UNSURE],
  ['evolution: a refused connection', 'evolution', REFUSED, HELD],
  ['evolution: 503 (Baileys may have sent it)', 'evolution', status(503), UNSURE],
  ['evolution: a timeout', 'evolution', TIMEOUT, UNSURE],
];

describe('failurePlan: line-level failures per driver', () => {
  const rows = CASES.map(([name, driver, failure, expected]) => ({
    name, driver, failure, expected,
  }));
  it.each(rows)('$name', (c) => {
    expect(planOf(c.driver, c.failure)).toMatchObject(c.expected);
  });

  it('a held row is the probe: next try in 1 min, this try not counted', () => {
    const plan = planOf('meta', status(503), 3);
    expect(plan).toMatchObject({ status: 'queued', attempts: 2 });
    expect(plan.next_attempt_at).toBe(new Date(NOW.getTime() + 60_000).toISOString());
  });

  it('a held row keeps the provider words for the admin', () => {
    expect(planOf('crm', status(503, null, '<html>down</html>')).error_text).toContain('503');
  });

  it('a timeout is marked timed out on every driver (the lane counts them)', () => {
    const drivers: readonly Driver[] = ['meta', 'kapso', 'evolution'];
    expect(drivers.map((d) => DRIVERS[d](TIMEOUT).info.timedOut)).toEqual([true, true, true]);
    expect(DRIVERS.meta(DROPPED).info.timedOut).toBeUndefined();
  });
});

describe('failurePlan: the crm driver\'s own connection', () => {
  const conn = (fail: Error) => ({
    env: { provider: 'crm' as const, base: 'http://crm.test', apiKey: 'k' },
    fetch: () => Promise.reject(fail),
    timeoutMs: 1_000,
  });
  const thrown = (fail: Error) =>
    crmJson(conn(fail), { path: 'messages' }).then(() => null, (e: unknown) => e);

  it('a refused connection holds the lane', async () => {
    const refused = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
    const plan = failurePlan({ error: await thrown(refused), attempts: 2, now: NOW });
    expect(plan).toMatchObject(HELD);
  });

  it('a timeout stays uncertain and is marked timed out', async () => {
    const error = await thrown(new DOMException('The operation timed out', 'TimeoutError'));
    expect(failurePlan({ error, attempts: 2, now: NOW })).toMatchObject(UNSURE);
    expect(error).toMatchObject({ info: { timedOut: true } });
  });
});

describe('failurePlan: unchanged per-message rules', () => {
  it('a CRM envelope 502 meta_error fails at once with its code', () => {
    const plan = planOf('crm', status(502, null, envelope('meta_error')));
    expect(plan).toMatchObject({ status: 'failed', error_code: 'crm_meta_error' });
  });

  it("a 5xx with Meta's own code keeps MAX_SEND_ATTEMPTS", () => {
    const err = status(503, metaCode(131000));
    expect(planOf('meta', err, 2)).toMatchObject({ status: 'queued', error_code: '131000' });
    expect(planOf('meta', err, 2).attempts).toBeUndefined();
    expect(planOf('meta', err, 3)).toMatchObject({ status: 'failed', error_code: '131000' });
  });

  it('a held row never goes past its expiry (a reminder expires at lesson start)', () => {
    const expires_at = new Date(NOW.getTime() + 20_000).toISOString();
    const error = DRIVERS.meta(status(503));
    const plan = failurePlan({ error, attempts: 1, now: NOW, row: { expires_at } });
    expect(plan.next_attempt_at).toBe(expires_at);
  });

  it('a row due 48 h ago is not held again: its tries count as before', () => {
    const due = new Date(NOW.getTime() - 49 * 3_600_000).toISOString();
    const row = { expires_at: null, scheduled_for: due };
    const plan = failurePlan({ error: DRIVERS.meta(status(503)), attempts: 3, now: NOW, row });
    expect(plan).toMatchObject({ status: 'failed', error_code: 'http_503' });
  });
});
