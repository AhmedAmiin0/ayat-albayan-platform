import { describe, expect, it } from 'vitest';
import { CRM_ENV, crmFailure } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { crmMe, KEY } from '@/modules/messaging/whatsapp/relay/relay.fakes';
import { RelayKeys } from './relay.keys';

// Scripted CRM answers only, no network.

const SCRIPT = 'Bearer script-key';
const OTHER = 'Bearer other-key';
const T0 = 1_000_000;
const MIN = 60_000;

function setup(...replies: Parameters<typeof scriptedFetch>) {
  const f = scriptedFetch(...replies);
  return { f, keys: new RelayKeys(), line: { env: CRM_ENV, fetch: f.fetch } };
}

const bearers = (f: ReturnType<typeof scriptedFetch>) =>
  f.requests.map((r) => (r.init.headers as Record<string, string>).authorization);

const REFUSED = [
  { name: 'a key the CRM refuses', replies: [crmFailure(401, 'unauthorized')], calls: 1 },
  { name: 'a key without messages:send', replies: [crmMe('acct-1', ['messages:read'])], calls: 1 },
  {
    name: 'a /me answer of another shape',
    replies: [{ status: 200, body: { data: {} } }],
    calls: 1,
  },
  { name: 'a key of another account', replies: [crmMe('acct-2'), crmMe('acct-1')], calls: 2 },
];

describe('RelayKeys', () => {
  it("the line's own key: accepted without asking the CRM; no header: refused", async () => {
    const s = setup();
    await expect(s.keys.accepts(KEY, s.line, T0)).resolves.toBe(true);
    await expect(s.keys.accepts(undefined, s.line, T0)).resolves.toBe(false);
    await expect(s.keys.accepts('Basic abc', s.line, T0)).resolves.toBe(false);
    expect(s.f.requests).toEqual([]);
  });

  it.each(REFUSED)('$name: $calls CRM call(s), then none for a minute', async (row) => {
    const s = setup(...row.replies, ...row.replies);
    await expect(s.keys.accepts(SCRIPT, s.line, T0)).resolves.toBe(false);
    expect(s.f.requests).toHaveLength(row.calls);
    await expect(s.keys.accepts(SCRIPT, s.line, T0 + MIN - 1)).resolves.toBe(false);
    expect(s.f.requests).toHaveLength(row.calls);
    await expect(s.keys.accepts(SCRIPT, s.line, T0 + MIN)).resolves.toBe(false);
    expect(s.f.requests.length).toBeGreaterThan(row.calls);
  });

  it('a key of the same account that may send: accepted, remembered for 10 minutes', async () => {
    const s = setup(crmMe(), crmMe(), crmMe());
    await expect(s.keys.accepts(SCRIPT, s.line, T0)).resolves.toBe(true);
    expect(bearers(s.f)).toEqual([SCRIPT, KEY]);
    expect(s.f.requests[0]?.url).toBe('http://127.0.0.1:4010/crm/api/v1/me');
    await expect(s.keys.accepts(SCRIPT, s.line, T0 + 9 * MIN)).resolves.toBe(true);
    expect(s.f.requests).toHaveLength(2);
    await expect(s.keys.accepts(SCRIPT, s.line, T0 + 11 * MIN)).resolves.toBe(true);
    expect(bearers(s.f)).toEqual([SCRIPT, KEY, SCRIPT]);
  });

  it("the line's own account is read once for every key checked", async () => {
    const s = setup(crmMe('acct-2'), crmMe('acct-1'), crmMe());
    await expect(s.keys.accepts(OTHER, s.line, T0)).resolves.toBe(false);
    await expect(s.keys.accepts(SCRIPT, s.line, T0)).resolves.toBe(true);
    expect(bearers(s.f)).toEqual([OTHER, KEY, SCRIPT]);
  });

  it("the line's own key refused by the CRM: refused, and neither verdict is remembered", async () => {
    const s = setup(crmMe(), crmFailure(401, 'unauthorized'), crmMe(), crmMe());
    await expect(s.keys.accepts(SCRIPT, s.line, T0)).resolves.toBe(false);
    await expect(s.keys.accepts(SCRIPT, s.line, T0)).resolves.toBe(true);
    expect(bearers(s.f)).toEqual([SCRIPT, KEY, SCRIPT, KEY]);
  });

  it('the CRM unreachable or failing: throws (the relay answers 502), nothing remembered', async () => {
    const s = setup(new TypeError('fetch failed'), crmFailure(500, 'internal'));
    await expect(s.keys.accepts(SCRIPT, s.line, T0)).rejects.toThrow();
    await expect(s.keys.accepts(SCRIPT, s.line, T0)).rejects.toThrow();
  });
});
