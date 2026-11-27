import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { studentCalls } from '../students-api';

const TEACHER = '44444444-4444-4444-8444-444444444444';
const emptyPage = { items: [], total: 0, page: 1, pageSize: 20 };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('student list read (R-STU-01, R-NFR-08)', () => {
  it('reads GET /students with the search, page, filters and sort', async () => {
    const { client, apiFetch } = clientAnswering(emptyPage);
    const query = { search: 'AB', page: 1, pageSize: 20, status: 'trial,active', teacher: TEACHER };
    const read = studentCalls(client).list({ ...query, sort: 'code', dir: 'desc' });
    await expect(read).resolves.toEqual(emptyPage);
    expect(apiFetch).toHaveBeenCalledWith(
      `/students?search=AB&page=1&pageSize=20&status=trial%2Cactive&teacher=${TEACHER}` +
        '&sort=code&dir=desc',
    );
  });

  it('hands the read signal on, so a superseded search frees its read', async () => {
    const { client, apiFetch } = clientAnswering(emptyPage);
    const abort = new AbortController();
    await studentCalls(client).list({ page: 2, pageSize: 50 }, abort.signal);
    expect(apiFetch).toHaveBeenCalledWith('/students?page=2&pageSize=50', { signal: abort.signal });
  });

  it('sends no empty search', async () => {
    const { client, apiFetch } = clientAnswering(emptyPage);
    await studentCalls(client).list({ search: '', page: 1, pageSize: 20 });
    expect(apiFetch).toHaveBeenCalledWith('/students?page=1&pageSize=20');
  });

  it('rejects an answer that is not a page of student rows', async () => {
    const { client } = clientAnswering({ items: [{ id: 'x' }], total: 1, page: 1, pageSize: 20 });
    const read = studentCalls(client).list({ page: 1 });
    await expect(read).rejects.toBeInstanceOf(ApiError);
    await expect(read).rejects.toMatchObject({ body: { code: 'bad_response' } });
  });
});
