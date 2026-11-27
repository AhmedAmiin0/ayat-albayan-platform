import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { salesCourseCalls } from './sales-course-api';

const STUDENT = 'c0000000-0000-4000-8000-000000000001';
const SUB = '11111111-1111-4111-8111-111111111111';
const VIEW = {
  student: {
    id: STUDENT,
    code: 'AB-0001',
    name: 'S',
    tz: 'Asia/Riyadh',
    program: 'quran',
    teacher_gender_pref: null,
    teacher_id: null,
  },
  subscription: null,
  perWeek: null,
  blocked: 'subscription_required',
};
const CHANGE = {
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

describe('the assistant course calls (R-ASST-01)', () => {
  it('reads the wizard view by the student id', async () => {
    const { client, apiFetch } = clientAnswering(VIEW);
    await expect(salesCourseCalls(client).view(STUDENT)).resolves.toEqual(VIEW);
    expect(apiFetch).toHaveBeenCalledWith(`/sales/booking/course?studentId=${STUDENT}`);
  });

  it('throws bad_response for a view with a block reason it does not know', async () => {
    const { client } = clientAnswering({ ...VIEW, blocked: 'unpaid' });
    const failure = await salesCourseCalls(client).view(STUDENT).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });

  it('POSTs her change check to her own route', async () => {
    const check = { conflicts: [], remaining: 6, endsOn: '2027-01-30' };
    const { client, apiSend } = clientAnswering(check);
    await expect(salesCourseCalls(client).check(CHANGE)).resolves.toEqual(check);
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/booking/course/change/check', CHANGE);
  });

  it('PUTs the draft and answers whether it was kept or booked', async () => {
    const saved = { state: 'draft', saved_at: '2026-11-27T10:00:00Z' };
    const { client, apiSend } = clientAnswering(saved);
    const body = {
      studentIds: [STUDENT],
      kind: 'package' as const,
      package: '8' as const,
      teacherId: SUB,
      byday: [2],
      startTimeLocal: '17:00',
      tz: 'Asia/Riyadh',
      durationMin: 45 as const,
      startsOn: '2026-12-01',
      startsAt: '2026-12-01T14:00:00Z',
    };
    await expect(salesCourseCalls(client).draft(body)).resolves.toEqual(saved);
    expect(apiSend).toHaveBeenCalledWith('PUT', '/sales/booking/course/draft', expect.anything());
  });

  it('POSTs the change with its retry key', async () => {
    const result = { subscriptionId: SUB, ruleIds: [SUB], endsOn: null };
    const { client, apiSend } = clientAnswering(result);
    const body = { ...CHANGE, clientRequestId: SUB };
    await expect(salesCourseCalls(client).change(body)).resolves.toEqual(result);
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/booking/course/change', body);
  });
});
