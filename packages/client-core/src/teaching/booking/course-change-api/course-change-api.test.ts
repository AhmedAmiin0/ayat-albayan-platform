import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { courseChangeCalls } from './course-change-api';

const SUB = '11111111-1111-4111-8111-111111111111';
const CHECK = { conflicts: [], remaining: 6, endsOn: '2027-01-30' };
const BODY = {
  subscriptionId: SUB,
  byday: [2],
  startTimeLocal: '17:00',
  startsOn: '2026-12-01',
  startsAt: '2026-12-01T15:00:00Z',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('course change calls (R-SCH-04)', () => {
  it('reads the course to change by its package id', async () => {
    const { client, apiFetch } = clientAnswering({});
    await courseChangeCalls(client).view(SUB).catch(() => null);
    expect(apiFetch).toHaveBeenCalledWith(`/booking/course/change?subscriptionId=${SUB}`);
  });

  it('POSTs the check and answers its clashes and lessons left', async () => {
    const { client, apiSend } = clientAnswering(CHECK);
    await expect(courseChangeCalls(client).check(BODY)).resolves.toEqual(CHECK);
    expect(apiSend).toHaveBeenCalledWith('POST', '/booking/course/change/check', BODY);
  });

  it('throws bad_response for a change answer without its rules', async () => {
    const { client } = clientAnswering({ subscriptionId: SUB, endsOn: null });
    const body = { ...BODY, clientRequestId: SUB };
    const failure = await courseChangeCalls(client).change(body).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
