import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { scheduleRuleCalls } from './schedule-rules-api';

const SUMMARY = { rules: 3, inserted: 5, failed: 0, ended: 0 };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('schedule rule calls (R-SCH-02)', () => {
  it('POSTs the refresh with no body and answers the pass counts', async () => {
    const { client, apiSend } = clientAnswering(SUMMARY);
    await expect(scheduleRuleCalls(client).refresh()).resolves.toEqual(SUMMARY);
    expect(apiSend).toHaveBeenCalledWith('POST', '/schedule-rules/refresh', undefined);
  });

  it('throws bad_response for an answer without its counts', async () => {
    const { client } = clientAnswering({ rules: 3 });
    const failure = await scheduleRuleCalls(client).refresh().catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
