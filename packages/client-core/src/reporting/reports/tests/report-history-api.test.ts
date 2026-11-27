import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../core/http';
import { reportHistoryCalls } from '../report-history-api';

const ID = '6f1c2b0e-8a4d-4c1e-9b7a-3d2e1f0a9b8c';
const PAGE = { items: [], total: 0, page: 2, pageSize: 10 };
const PENDING = {
  lesson_id: ID,
  starts_at: '2026-11-20T17:00:00.000Z',
  status: 'completed',
  student: { id: ID, code: 'AB-0201', name: 'طالب' },
  report_id: null,
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('report history calls', () => {
  it("reads a student's history page with its series on the path of today", async () => {
    const answer = { ...PAGE, series: [] };
    const { client, apiFetch } = clientAnswering(answer);
    const calls = reportHistoryCalls(client);
    await expect(calls.student({ id: ID }, { page: 2, pageSize: 10 })).resolves.toEqual(answer);
    expect(apiFetch).toHaveBeenCalledWith(`/students/${ID}/reports?page=2&pageSize=10`);
  });

  it('reads my missing reports and my sent ones, with the filters as a query', async () => {
    const { client, apiFetch } = clientAnswering([PENDING]);
    const calls = reportHistoryCalls(client);
    await expect(calls.pending()).resolves.toEqual([PENDING]);
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/pending-reports');
    apiFetch.mockResolvedValueOnce(PAGE);
    await expect(calls.mine({ attendance: 'late', page: 2 })).resolves.toEqual(PAGE);
    expect(apiFetch).toHaveBeenLastCalledWith('/teachers/me/reports?attendance=late&page=2');
  });

  it('refuses an answer that is not the list it promised', async () => {
    const { client } = clientAnswering([{ ...PENDING, status: 'missed' }]);
    await expect(reportHistoryCalls(client).pending()).rejects.toMatchObject({
      body: { code: 'bad_response' },
    });
  });
});
