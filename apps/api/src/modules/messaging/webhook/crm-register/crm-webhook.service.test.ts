import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { endpoint, FAKE_SECRET, registrarKit, TARGET } from './crm-webhook.fakes';

// docs/19 «crm driver» › delivery ticks in one click: the happy paths. No network.

afterEach(() => vi.restoreAllMocks());

describe('CrmWebhookRegistrar.register', () => {
  it('creates one message.status_updated endpoint at <API_PUBLIC_URL>/webhooks/wacrm', async () => {
    const kit = registrarKit();
    const result = await kit.registrar.register();
    expect(result).toEqual({
      id: 'new-1',
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

  it('removes every endpoint already aimed at our receiver, and only those', async () => {
    const list = [endpoint('old-1'), endpoint('other', 'https://elsewhere.example/hook'), endpoint('old-2')];
    const kit = registrarKit({ answers: { 'GET webhooks': { status: 200, body: { data: list } } } });
    const result = await kit.registrar.register();
    expect(result.replaced).toBe(2);
    const deletes = kit.crm.calls.filter((c) => c.method === 'DELETE').map((c) => c.path);
    expect(deletes).toEqual(['webhooks/old-1', 'webhooks/old-2']);
    expect(kit.crm.calls.at(-1)?.method).toBe('POST');
  });

  it('never puts the secret in its answer or in any log line', async () => {
    const spies = (['log', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(Logger.prototype, m).mockImplementation(() => undefined),
    );
    const kit = registrarKit();
    const result = await kit.registrar.register();
    expect(JSON.stringify(result)).not.toContain(FAKE_SECRET);
    expect(JSON.stringify(result)).not.toContain('whsec_');
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain(FAKE_SECRET);
    expect(spies[0]?.mock.calls.length).toBeGreaterThan(0);
  });
});
