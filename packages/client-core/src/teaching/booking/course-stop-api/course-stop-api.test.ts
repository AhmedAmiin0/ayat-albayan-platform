import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { courseStopCalls } from './course-stop-api';

const STUDENT = 'e1111111-1111-4111-8111-111111111111';
const SUB = 'e2222222-2222-4222-8222-222222222222';
const REQ = 'e3333333-3333-4333-8333-333333333333';
const PREVIEW = {
  subscriptionId: SUB,
  futureLessons: 0,
  futureStarts: [],
  activeRules: 0,
  paid: 0,
  currency: 'SAR',
  refund: null,
  refundUnavailable: false,
  owe: { charged: 0, price: 400 },
  stopped: null,
};
const RESULT = {
  subscriptionId: SUB,
  cancelledLessons: 0,
  endedRules: 0,
  studentStatus: 'churned',
  stoppedAt: '2026-11-27T10:00:00.000Z',
  refund: null,
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('course stop calls', () => {
  it("reads the stop sheet of the student's named package", async () => {
    const { client, apiFetch } = clientAnswering(PREVIEW);
    const ref = { studentId: STUDENT, subscriptionId: SUB };
    await expect(courseStopCalls(client).preview(ref)).resolves.toEqual(PREVIEW);
    expect(apiFetch).toHaveBeenCalledWith(`/students/${STUDENT}/course-stop?subscriptionId=${SUB}`);
  });

  it('POSTs the stop body unchanged and answers what it did', async () => {
    const { client, apiSend } = clientAnswering(RESULT);
    const body = { subscriptionId: SUB, reason: 'سفر', clientRequestId: REQ };
    await expect(courseStopCalls(client).stop(STUDENT, body)).resolves.toEqual(RESULT);
    expect(apiSend).toHaveBeenCalledWith('POST', `/students/${STUDENT}/course-stop`, body);
  });

  it('throws bad_response for a preview without its owe numbers', async () => {
    const { owe: _owe, ...noOwe } = PREVIEW;
    const { client } = clientAnswering(noOwe);
    const failure = await courseStopCalls(client)
      .preview({ studentId: STUDENT, subscriptionId: SUB })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
