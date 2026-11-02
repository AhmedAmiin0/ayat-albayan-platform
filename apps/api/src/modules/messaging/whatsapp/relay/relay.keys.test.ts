import { describe, expect, it } from 'vitest';
import { CRM_ENV, crmFailure } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { crmMe, KEY } from './relay.fakes';
import { RelayKeys } from './relay.keys';

// The script's own CRM key: accepted only when the CRM reports it on the line key's account with
// messages:send; remembered 10 minutes. Scripted CRM answers, no network.

const SCRIPT = 'Bearer script-key';
const T0 = 1_000_000;

function setup(...replies: Parameters<typeof scriptedFetch>) {
  const f = scriptedFetch(...replies);
  return { f, keys: new RelayKeys(), line: { env: CRM_ENV, fetch: f.fetch } };
}

const bearers = (f: ReturnType<typeof scriptedFetch>) =>
  f.requests.map((r) => (r.init.headers as Record<string, string>).authorization);

describe('RelayKeys', () => {
  it("the line's own key: accepted without asking the CRM; no header: refused", async () => {
    const s = setup();
    await expect(s.keys.accepts(KEY, s.line, T0)).resolves.toBe(true);
    await expect(s.keys.accepts(undefined, s.line, T0)).resolves.toBe(false);
    await expect(s.keys.accepts('Basic abc', s.line, T0)).resolves.toBe(false);
    expect(s.f.requests).toEqual([]);
  });

  it('another key of the same account that may send: accepted, then remembered for 10 minutes', async () => {
    const s = setup(crmMe(), crmMe(), crmMe(), crmMe());
    await expect(s.keys.accepts(SCRIPT, s.line, T0)).resolves.toBe(true);
    expect(s.f.requests.map((r) => r.url)).toEqual([
      'http://127.0.0.1:4010/crm/api/v1/me',
      'http://127.0.0.1:4010/crm/api/v1/me',
    ]);
    expect(bearers(s.f)).toEqual([SCRIPT, KEY]);
    await expect(s.keys.accepts(SCRIPT, s.line, T0 + 9 * 60_000)).resolves.toBe(true);
    expect(s.f.requests).toHaveLength(2);
    await expect(s.keys.accepts(SCRIPT, s.line, T0 + 11 * 60_000)).resolves.toBe(true);
    expect(s.f.requests).toHaveLength(4);
  });

  it('a key the CRM refuses: one call, refused, not remembered', async () => {
    const s = setup(crmFailure(401, 'unauthorized'), crmFailure(401, 'unauthorized'));
    await expect(s.keys.accepts(SCRIPT, s.line, T0)).resolves.toBe(false);
    await expect(s.keys.accepts(SCRIPT, s.line, T0)).resolves.toBe(false);
    expect(bearers(s.f)).toEqual([SCRIPT, SCRIPT]);
  });

  it('refused: a key without messages:send, or a key of another account', async () => {
    const noScope = setup(crmMe('acct-1', ['messages:read']));
    await expect(noScope.keys.accepts(SCRIPT, noScope.line, T0)).resolves.toBe(false);
    const other = setup(crmMe('acct-2'), crmMe('acct-1'));
    await expect(other.keys.accepts(SCRIPT, other.line, T0)).resolves.toBe(false);
  });

  it('a /me answer not in the expected shape is refused', async () => {
    const s = setup({ status: 200, body: { data: { account: { name: 'x' } } } });
    await expect(s.keys.accepts(SCRIPT, s.line, T0)).resolves.toBe(false);
  });

  it('the CRM unreachable or failing: throws (the relay answers 502), nothing remembered', async () => {
    const s = setup(new TypeError('fetch failed'), crmFailure(500, 'internal'));
    await expect(s.keys.accepts(SCRIPT, s.line, T0)).rejects.toThrow();
    await expect(s.keys.accepts(SCRIPT, s.line, T0)).rejects.toThrow();
  });
});
