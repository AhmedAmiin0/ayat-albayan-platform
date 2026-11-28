import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { numbersCalls } from '../numbers-api';

const ID = '6f1c2a40-0b7e-4c2f-9d1a-3e5b7c9d1f20';
const STATE = { set: false, updated_at: null };
const NUMBER = {
  id: ID, label: 'Chat', purpose: 'chat', provider: 'meta', phone_number_id: '1001',
  waba_id: null, app_id: null, display_phone_e164: null, enabled: false, is_default: false,
  fallback_rank: 0, health: null, checked_at: null, updated_at: '2026-11-27T10:00:00.000Z',
  secrets: {
    access_token: STATE, app_secret: STATE, evolution_token: STATE,
    evolution_cloud_token: STATE, evolution_proxy_password: STATE,
  },
  evolution: null,
};

const CREATE = {
  label: 'Chat', purpose: 'chat', provider: 'meta', phone_number_id: '1001', enabled: false,
} as const;

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('numbers calls', () => {
  it('reads the numbers and the own traffic on the paths of today', async () => {
    const { client, apiFetch } = clientAnswering([NUMBER]);
    await expect(numbersCalls(client).list()).resolves.toEqual([NUMBER]);
    const traffic = clientAnswering({ inbound_7d: 2 });
    await expect(numbersCalls(traffic.client).ownTraffic()).resolves.toEqual({ inbound_7d: 2 });
    expect(apiFetch.mock.calls).toEqual([['/admin/numbers']]);
    expect(traffic.apiFetch.mock.calls).toEqual([['/admin/numbers/own-traffic']]);
  });

  it('creates, edits and deletes a number by its id', async () => {
    const { client, apiSend } = clientAnswering(NUMBER);
    const calls = numbersCalls(client);
    await calls.create(CREATE);
    await calls.update({ id: ID, body: { label: 'Main' } });
    expect(apiSend.mock.calls).toEqual([
      ['POST', '/admin/numbers', CREATE],
      ['PATCH', `/admin/numbers/${ID}`, { label: 'Main' }],
    ]);
    const empty = clientAnswering(undefined);
    await numbersCalls(empty.client).remove(ID);
    expect(empty.apiSend.mock.calls).toEqual([['DELETE', `/admin/numbers/${ID}`, undefined]]);
  });

  it('writes and clears a secret by its name, sending the value only on the write', async () => {
    const { client, apiSend } = clientAnswering(NUMBER);
    const calls = numbersCalls(client);
    await calls.putSecret({ id: ID, name: 'app_secret', value: 's' });
    await calls.clearSecret({ id: ID, name: 'app_secret' });
    expect(apiSend.mock.calls).toEqual([
      ['PUT', `/admin/numbers/${ID}/secrets/app_secret`, { value: 's' }],
      ['DELETE', `/admin/numbers/${ID}/secrets/app_secret`, undefined],
    ]);
  });

  it('previews or applies the import with dryRun as the body', async () => {
    const answer = { dry_run: true, changed: false, roles: [] };
    const { client, apiSend } = clientAnswering(answer);
    await expect(numbersCalls(client).import(true)).resolves.toEqual(answer);
    expect(apiSend.mock.calls).toEqual([['POST', '/admin/numbers/import', { dryRun: true }]]);
  });

  it('refuses a number view that carries a provider it does not know', async () => {
    const { client } = clientAnswering([{ ...NUMBER, provider: 'twilio' }]);
    await expect(numbersCalls(client).list()).rejects.toBeInstanceOf(ApiError);
  });
});
