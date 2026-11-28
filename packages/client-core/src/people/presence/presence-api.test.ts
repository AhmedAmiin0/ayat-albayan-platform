import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../core/http';
import { presenceSelfCall, staffPresenceCall } from './presence-api';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('presence calls', () => {
  it('reads GET /presence/me', async () => {
    const { client, apiFetch } = clientAnswering({ enabled: false });
    await expect(presenceSelfCall(client)()).resolves.toEqual({ enabled: false });
    expect(apiFetch).toHaveBeenCalledWith('/presence/me');
  });

  it('reads GET /presence/staff', async () => {
    const staff = { enabled: true, staff: [] };
    const { client, apiFetch } = clientAnswering(staff);
    await expect(staffPresenceCall(client)()).resolves.toEqual(staff);
    expect(apiFetch).toHaveBeenCalledWith('/presence/staff');
  });

  it('refuses a staff answer without its list', async () => {
    const { client } = clientAnswering({ enabled: true });
    const failure = await staffPresenceCall(client)().catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response', path: '/presence/staff' } });
  });
});
