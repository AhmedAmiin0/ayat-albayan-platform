import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { bookingCalls, salesBookingCalls } from './booking-api';

const TEACHER = '33333333-3333-4333-8333-333333333333';
const STUDENT = '11111111-1111-4111-8111-111111111111';
const BODY = {
  studentIds: [STUDENT],
  kind: 'trial' as const,
  package: 'trial' as const,
  teacherId: TEACHER,
  byday: [2],
  startTimeLocal: '15:00',
  tz: 'Europe/London',
  durationMin: 45 as const,
  startsOn: '2026-12-01',
  startsAt: '2026-12-01T15:00:00Z',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('booking calls (R-SCH-06, R-ASST-01)', () => {
  it('reads the admin teachers of a program', async () => {
    const { client, apiFetch } = clientAnswering([]);
    await expect(bookingCalls(client).teachers({ program: 'quran' })).resolves.toEqual([]);
    expect(apiFetch).toHaveBeenCalledWith('/booking/teachers?program=quran');
  });

  it('reads the sales slot grid under the sales base', async () => {
    const { client, apiFetch } = clientAnswering({});
    const query = { teacherId: TEACHER, from: 'a', to: 'b', durationMin: 45 };
    await salesBookingCalls(client).slots(query).catch(() => null);
    expect(apiFetch).toHaveBeenCalledWith(
      `/sales/booking/slots?teacherId=${TEACHER}&from=a&to=b&durationMin=45`,
    );
  });

  it('POSTs the check and answers its clashes', async () => {
    const { client, apiSend } = clientAnswering({ conflicts: [] });
    await expect(bookingCalls(client).check(BODY)).resolves.toEqual({ conflicts: [] });
    expect(apiSend).toHaveBeenCalledWith('POST', '/booking/check', BODY);
  });

  it('throws bad_response for a booking answer without its lessons', async () => {
    const { client, apiSend } = clientAnswering({ rule_id: TEACHER });
    const failure = await salesBookingCalls(client).book(BODY).catch((e: unknown) => e);
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/booking', BODY);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });

  it('reads the outside slots with the grid fields only', async () => {
    const { client, apiFetch } = clientAnswering({});
    const query = { teacherId: TEACHER, durationMin: 30, studentIds: STUDENT };
    await bookingCalls(client).outsideSlots(query).catch(() => null);
    expect(apiFetch).toHaveBeenCalledWith(
      `/booking/outside-slots?teacherId=${TEACHER}&durationMin=30&studentIds=${STUDENT}`,
    );
  });
});
