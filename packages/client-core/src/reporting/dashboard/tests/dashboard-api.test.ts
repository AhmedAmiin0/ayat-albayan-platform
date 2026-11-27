import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { dashboardCalls } from '../dashboard-api';

const WORK = {
  pending_reports: { total: 0, items: [] },
  unpaid: { total: 0, items: [] },
  tasks: { total: 0, items: [] },
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch };
};

describe('dashboard calls', () => {
  it('reads the work queue on the path of today', async () => {
    const { client, apiFetch } = clientAnswering(WORK);
    await expect(dashboardCalls(client).work()).resolves.toEqual(WORK);
    expect(apiFetch).toHaveBeenCalledWith('/dashboard/work');
  });

  it('asks for the summary of a range of Riyadh days', async () => {
    const { client, apiFetch } = clientAnswering({});
    const asked = dashboardCalls(client).summary({ from: '2026-11-01', to: '2026-11-30' });
    await expect(asked).rejects.toBeInstanceOf(ApiError);
    expect(apiFetch).toHaveBeenCalledWith('/dashboard/summary?from=2026-11-01&to=2026-11-30');
  });

  it('refuses a work queue that misses a list', async () => {
    const { client } = clientAnswering({ ...WORK, tasks: undefined });
    await expect(dashboardCalls(client).work()).rejects.toMatchObject({ body: { code: 'bad_response' } });
  });
});
