import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { salesTrialDateCalls, trialDateCalls } from './trial-date-api';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const TEACHER = '33333333-3333-4333-8333-333333333333';
const BODY = {
  studentIds: [STUDENT],
  kind: 'trial' as const,
  package: 'trial' as const,
  teacherId: TEACHER,
  byday: [2],
  startTimeLocal: '15:00',
  tz: 'Europe/London',
  durationMin: 45,
  startsOn: '2026-12-01',
  startsAt: '2026-12-01T15:00:00Z',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('trial date calls (R-SCH-06)', () => {
  it('reads the admin history by student id', async () => {
    const { client, apiFetch } = clientAnswering({});
    await trialDateCalls(client).history(STUDENT).catch(() => null);
    expect(apiFetch).toHaveBeenCalledWith(`/booking/trial-dates?studentId=${STUDENT}`);
  });

  it('reads the sales history under the sales base', async () => {
    const { client, apiFetch } = clientAnswering({});
    await salesTrialDateCalls(client).history(STUDENT).catch(() => null);
    expect(apiFetch).toHaveBeenCalledWith(`/sales/booking/trial-dates?studentId=${STUDENT}`);
  });

  it('POSTs the check and answers its clashes', async () => {
    const { client, apiSend } = clientAnswering({ conflicts: [] });
    await expect(trialDateCalls(client).check(BODY)).resolves.toEqual({ conflicts: [] });
    expect(apiSend).toHaveBeenCalledWith('POST', '/booking/trial-date/check', BODY);
  });

  it('throws bad_response for a pick answer without its lesson', async () => {
    const { client } = clientAnswering({ moved_from_id: null });
    const failure = await salesTrialDateCalls(client).pick(BODY).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
