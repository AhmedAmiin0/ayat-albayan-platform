import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { integrationCalls } from '..';

const ITEM = {
  key: 'WA_WABA_ID',
  group: 'wa_notifications',
  secret: false,
  value: 'waba-1',
  set: true,
  source: 'db',
  updated_at: '2026-10-12T08:00:00Z',
};

const clientAnswering = (answer: unknown): ApiClient => ({
  apiFetch: vi.fn(async () => answer),
  apiSend: vi.fn(async () => answer),
});

describe('integration calls', () => {
  it('reads every key on the path of today', async () => {
    const client = clientAnswering([ITEM]);
    await expect(integrationCalls(client).list()).resolves.toEqual([ITEM]);
    expect(client.apiFetch).toHaveBeenCalledWith('/settings/integrations');
  });

  it('saves plain values, sets and clears a secret, and probes storage', async () => {
    const client = clientAnswering([ITEM]);
    const calls = integrationCalls(client);
    await calls.saveValues({ values: { WA_WABA_ID: 'w2', FX_API_URL: null } });
    await calls.saveSecret({ key: 'WA_APP_SECRET', value: 'tok' });
    await calls.clearSecret('LIVEKIT_API_SECRET');
    const values = { values: { WA_WABA_ID: 'w2', FX_API_URL: null } };
    expect(client.apiSend).toHaveBeenNthCalledWith(1, 'PUT', '/settings/integrations', values);
    const secret = '/settings/integrations/secrets/WA_APP_SECRET';
    expect(client.apiSend).toHaveBeenNthCalledWith(2, 'PUT', secret, { value: 'tok' });
    const cleared = '/settings/integrations/secrets/LIVEKIT_API_SECRET';
    expect(client.apiSend).toHaveBeenNthCalledWith(3, 'DELETE', cleared, undefined);
  });

  it('probes storage and reads its round trip time', async () => {
    const client = clientAnswering({ data: { ok: true, ms: 12 } });
    await expect(integrationCalls(client).probeStorage()).resolves.toEqual({
      data: { ok: true, ms: 12 },
    });
    const path = '/settings/integrations/storage-probe';
    expect(client.apiSend).toHaveBeenCalledWith('POST', path, undefined);
  });

  it('refuses an answer outside the shared schema', async () => {
    const client = clientAnswering([{ ...ITEM, source: 'vault' }]);
    await expect(integrationCalls(client).list()).rejects.toMatchObject({
      body: { code: 'bad_response' },
    });
  });
});
