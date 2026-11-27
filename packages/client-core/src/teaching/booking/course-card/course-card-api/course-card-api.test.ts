import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { courseCardCalls } from './course-card-api';

const STUDENT = 'e1111111-1111-4111-8111-111111111111';
const SUB = 'e2222222-2222-4222-8222-222222222222';
const CARD = { subscriptionId: SUB, package: null, course: null, upcoming: [] };
const PREVIEW = { subscriptionId: SUB, starts: [], tz: 'Asia/Riyadh', endsOn: null, notified: [] };
const BOOKED = { subscriptionId: SUB, inserted: 0, endsOn: null, conflicts: 0 };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('course card calls', () => {
  it("reads the admin's card and the assistant's card from their own paths", async () => {
    const { client, apiFetch } = clientAnswering(CARD);
    const calls = courseCardCalls(client);
    await expect(calls.card({ studentId: STUDENT, tree: 'admin' })).resolves.toEqual(CARD);
    await calls.card({ studentId: STUDENT, tree: 'sales' });
    expect(apiFetch.mock.calls).toEqual([
      [`/students/${STUDENT}/course-card`],
      [`/sales/students/${STUDENT}/course-card`],
    ]);
  });

  it('previews one package through the query string', async () => {
    const { client, apiFetch } = clientAnswering(PREVIEW);
    const input = { studentId: STUDENT, subscriptionId: SUB };
    await expect(courseCardCalls(client).extendPreview(input)).resolves.toEqual(PREVIEW);
    expect(apiFetch).toHaveBeenCalledWith(`/students/${STUDENT}/course-extend?subscriptionId=${SUB}`);
  });

  it('POSTs the package to extend and answers what was booked', async () => {
    const { client, apiSend } = clientAnswering(BOOKED);
    const extend = courseCardCalls(client).extend({ studentId: STUDENT, subscriptionId: SUB });
    await expect(extend).resolves.toEqual(BOOKED);
    const path = `/students/${STUDENT}/course-extend`;
    expect(apiSend).toHaveBeenCalledWith('POST', path, { subscriptionId: SUB });
  });

  it('throws bad_response for a card without its upcoming lessons', async () => {
    const { client } = clientAnswering({ subscriptionId: SUB, course: null });
    const failure = await courseCardCalls(client)
      .card({ studentId: STUDENT, tree: 'admin' })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
