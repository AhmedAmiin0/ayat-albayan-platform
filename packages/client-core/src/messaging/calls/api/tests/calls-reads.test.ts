import { describe, expect, it } from 'vitest';
import { callReads } from '../calls-api';
import { answering } from './calls.test-util';

const PHONE = '+966501234567';

describe('callReads, one call per read route', () => {
  it('reads the config and a number permission on their paths', async () => {
    const config = { enabled: false, available: false, canCall: false, iceServers: [] };
    const { api, apiFetch } = answering(config);
    await expect(callReads(api).config()).resolves.toEqual(config);
    const permission = { state: 'granted', expires_at: null };
    apiFetch.mockResolvedValueOnce(permission);
    await expect(callReads(api).permission(PHONE)).resolves.toEqual(permission);
    expect(apiFetch.mock.calls).toEqual([['/calls/config'], ['/calls/permission/%2B966501234567']]);
  });

  it('reads the active calls and the log with the query it is given', async () => {
    const { api, apiFetch } = answering([]);
    await expect(callReads(api).active()).resolves.toEqual([]);
    await callReads(api).list({ phone: PHONE, limit: 50 });
    await callReads(api).list({ limit: 100 });
    expect(apiFetch.mock.calls).toEqual([
      ['/calls/active'],
      ['/calls?phone=%2B966501234567&limit=50'],
      ['/calls?limit=100'],
    ]);
  });
});
