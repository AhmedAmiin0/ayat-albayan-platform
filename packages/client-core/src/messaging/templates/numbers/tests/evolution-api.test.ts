import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { evolutionCalls } from '../evolution-api';

const ID = '6f1c2a40-0b7e-4c2f-9d1a-3e5b7c9d1f20';
const AT = '2026-11-27T10:00:00.000Z';
const BASE = `/admin/numbers/${ID}/evolution`;
const SYNC = {
  synced: false,
  checked_at: AT,
  parts: { instance: 'synced', settings: 'drift', webhook: 'failed', proxy: 'skipped' },
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('evolution calls', () => {
  it('reads the state and the qr of one number on the paths of today', async () => {
    const state = clientAnswering({ state: 'open', checked_at: AT });
    await expect(evolutionCalls(state.client).state(ID)).resolves.toEqual({
      state: 'open',
      checked_at: AT,
    });
    const qr = clientAnswering({ state: 'close', qr: null, pairing_code: null });
    await evolutionCalls(qr.client).qr(ID);
    expect([...state.apiFetch.mock.calls, ...qr.apiFetch.mock.calls]).toEqual([
      [`${BASE}/state`],
      [`${BASE}/qr`],
    ]);
  });

  it('saves the config, pushes with no body and reads the sync back', async () => {
    const { client, apiFetch, apiSend } = clientAnswering(SYNC);
    const calls = evolutionCalls(client);
    const config = { proxy: { enabled: false } };
    await expect(calls.saveConfig({ id: ID, config })).resolves.toEqual(SYNC);
    await calls.push(ID);
    await calls.verify(ID);
    expect(apiSend.mock.calls).toEqual([
      ['PUT', `${BASE}/config`, config],
      ['POST', `${BASE}/sync`, undefined],
    ]);
    expect(apiFetch.mock.calls).toEqual([[`${BASE}/sync`]]);
  });

  it('refuses an answer that is not a sync view', async () => {
    const { client } = clientAnswering({ synced: 'yes' });
    await expect(evolutionCalls(client).verify(ID)).rejects.toThrow();
  });
});
