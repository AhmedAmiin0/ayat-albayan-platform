import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { familyRequestCalls } from '..';

const ID = '00000000-0000-4000-8000-000000000001';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async (_path: string) => answer);
  const apiSend = vi.fn(async (_m: string, _path: string, _body?: unknown) => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('familyRequestCalls (R-SCH-08)', () => {
  it('reads the waiting family requests', async () => {
    const { client, apiFetch } = clientAnswering([]);
    await expect(familyRequestCalls(client).pending()).resolves.toEqual([]);
    expect(apiFetch).toHaveBeenCalledWith('/family-requests');
  });

  it('refuses a waiting row whose ids are not uuids', async () => {
    const { client } = clientAnswering([{ id: 'p1', lesson_id: 'l1' }]);
    await expect(familyRequestCalls(client).pending()).rejects.toThrow();
  });

  it('approves the asked time with an empty body', async () => {
    const { client, apiSend } = clientAnswering(null);
    await expect(familyRequestCalls(client).approve({ id: ID }, {})).rejects.toThrow();
    expect(apiSend).toHaveBeenCalledWith('POST', `/family-requests/${ID}/approve`, {});
  });

  it('declines with the note the family reads, and refuses an answer that is not a lesson', async () => {
    const { client, apiSend } = clientAnswering({ id: ID });
    const body = { note: 'لا يتوفر وقت آخر' };
    await expect(familyRequestCalls(client).reject({ id: ID }, body)).rejects.toThrow();
    expect(apiSend).toHaveBeenCalledWith('POST', `/family-requests/${ID}/reject`, body);
  });
});
