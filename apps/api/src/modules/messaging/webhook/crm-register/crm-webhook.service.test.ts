import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { endpoint, FAKE_SECRET, IDS, registrarKit, TARGET } from './crm-webhook.fakes';

// docs/19 «crm driver» › delivery ticks in one click: the happy paths. No network.

afterEach(() => vi.restoreAllMocks());

const listing = (data: unknown[]) => ({ 'GET webhooks': { status: 200, body: { data } } });
const OLD = [endpoint(IDS.old1), endpoint(IDS.other, 'https://elsewhere.example/hook'), endpoint(IDS.old2)];

describe('CrmWebhookRegistrar.register', () => {
  it('creates one message.status_updated endpoint at <API_PUBLIC_URL>/webhooks/wacrm', async () => {
    const kit = registrarKit();
    const result = await kit.registrar.register();
    expect(result).toEqual({
      id: IDS.created,
      url: TARGET,
      events: ['message.status_updated'],
      replaced: 0,
    });
    expect(kit.crm.calls).toEqual([
      { method: 'GET', path: 'webhooks', body: undefined },
      {
        method: 'POST',
        path: 'webhooks',
        body: { url: TARGET, events: ['message.status_updated'] },
      },
    ]);
  });

  it('stores the secret as WACRM_WEBHOOK_SECRET through the «التكاملات» write path', async () => {
    const kit = registrarKit();
    await kit.registrar.register();
    expect(kit.setSecret).toHaveBeenCalledExactlyOnceWith({
      key: 'WACRM_WEBHOOK_SECRET',
      value: FAKE_SECRET,
    });
  });

  it('after the new one is stored, removes the older endpoints aimed at our receiver only', async () => {
    const kit = registrarKit({ answers: listing(OLD) });
    kit.setSecret.mockImplementation(async () => {
      expect(kit.crm.calls.some((c) => c.method === 'DELETE')).toBe(false);
    });
    const result = await kit.registrar.register();
    expect(result.replaced).toBe(2);
    expect(kit.crm.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'GET webhooks',
      'POST webhooks',
      `DELETE webhooks/${IDS.old1}`,
      `DELETE webhooks/${IDS.old2}`,
    ]);
  });

  it('never removes the endpoint it just made, even if the listing already showed it', async () => {
    const kit = registrarKit({ answers: listing([endpoint(IDS.created)]) });
    expect((await kit.registrar.register()).replaced).toBe(0);
    expect(kit.crm.calls.some((c) => c.method === 'DELETE')).toBe(false);
  });

  it('an old endpoint already gone (404) counts as removed', async () => {
    const gone = { status: 404, body: { error: { code: 'not_found', message: 'gone' } } };
    const answers = { ...listing(OLD), [`DELETE webhooks/${IDS.old1}`]: gone };
    expect((await registrarKit({ answers }).registrar.register()).replaced).toBe(2);
  });

  it('a failed removal is logged by id, never fails the request', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const down = { status: 500, body: { error: { code: 'internal', message: 'down' } } };
    const answers = { ...listing(OLD), [`DELETE webhooks/${IDS.old2}`]: down };
    const result = await registrarKit({ answers }).registrar.register();
    expect(result).toMatchObject({ id: IDS.created, replaced: 1 });
    expect(JSON.stringify(warn.mock.calls)).toContain(IDS.old2);
  });

  it('never puts the secret in its answer or in any log line', async () => {
    const spies = (['log', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(Logger.prototype, m).mockImplementation(() => undefined),
    );
    const result = await registrarKit({ answers: listing(OLD) }).registrar.register();
    expect(JSON.stringify(result)).not.toContain('whsec_');
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain(FAKE_SECRET);
    expect(spies[0]?.mock.calls.length).toBeGreaterThan(0);
  });
});
