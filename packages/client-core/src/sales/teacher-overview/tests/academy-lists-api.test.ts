import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { salesAcademyListCalls } from '../academy-lists-api';

const SUB = 'c1000000-0000-4000-8000-0000000000c1';
const TEACHER = {
  id: 'tc1',
  name: 'أبرار',
  name_en: null,
  gender: 'female',
  programs: ['quran'],
  lessons_today: 0,
  live_now: false,
  active_count: 0,
  trial_count: 0,
  meeting_link: null,
  students: [],
};
const HISTORY = {
  subscription_id: SUB,
  student: { id: 's1', code: 'AB-0101', name: 'ياسمين' },
  subscriptions: [],
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('sales academy list calls', () => {
  it('reads the teachers on the path of today', async () => {
    const { client, apiFetch } = clientAnswering([TEACHER]);
    await expect(salesAcademyListCalls(client).teachers()).resolves.toEqual([TEACHER]);
    expect(apiFetch).toHaveBeenCalledWith('/sales/teachers');
  });

  it('reads a subscription history on the path of today', async () => {
    const { client, apiFetch } = clientAnswering(HISTORY);
    await expect(salesAcademyListCalls(client).history(SUB)).resolves.toEqual(HISTORY);
    expect(apiFetch).toHaveBeenCalledWith(`/sales/subscriptions/${SUB}/history`);
  });

  it('throws bad_response for a teacher list that is not a list', async () => {
    const { client } = clientAnswering({});
    const failure = await salesAcademyListCalls(client)
      .teachers()
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });

  it('reads one page of every student with the page, size and search of today', async () => {
    const page = { items: [], total: 0, page: 2, pageSize: 25 };
    const { client, apiFetch } = clientAnswering(page);
    const query = { page: 2, pageSize: 25, search: 'AB' };
    await expect(salesAcademyListCalls(client).students(query)).resolves.toEqual(page);
    expect(apiFetch).toHaveBeenCalledWith('/sales/students/all?page=2&pageSize=25&search=AB');
  });

  it('throws bad_response for a student row with an unknown status', async () => {
    const row = { id: 's1', code: 'AB-0101', name: 'ي', status: 'lost', program: 'quran' };
    const extra = { teacher_name: null, guardian_name: '', guardian_phone: null };
    const page = { items: [{ ...row, ...extra }], total: 1, page: 1, pageSize: 25 };
    const { client } = clientAnswering(page);
    const failure = await salesAcademyListCalls(client)
      .students({ page: 1, pageSize: 25 })
      .catch((e: unknown) => e);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
