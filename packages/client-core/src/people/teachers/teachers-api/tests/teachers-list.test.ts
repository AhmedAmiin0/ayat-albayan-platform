import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { teacherCalls } from '../teachers-api';

const emptyPage = { items: [], total: 0, page: 2, pageSize: 25 };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('teacher list read (R-TCH-01, R-NFR-08)', () => {
  it('reads GET /teachers with the page, sort and column filters', async () => {
    const { client, apiFetch } = clientAnswering(emptyPage);
    const read = teacherCalls(client).list({ page: 2, pageSize: 25, sort: 'name', name: 'سارة' });
    await expect(read).resolves.toEqual(emptyPage);
    expect(apiFetch).toHaveBeenCalledWith(
      `/teachers?page=2&pageSize=25&sort=name&name=${encodeURIComponent('سارة')}`,
    );
  });

  it('leaves blank filters out of the query', async () => {
    const { client, apiFetch } = clientAnswering(emptyPage);
    await teacherCalls(client).list({ page: 1, phone: '' });
    expect(apiFetch).toHaveBeenCalledWith('/teachers?page=1');
  });

  it('rejects an answer that is not a page of teacher rows', async () => {
    const { client } = clientAnswering({ items: [] });
    const read = teacherCalls(client).list({ page: 1 });
    await expect(read).rejects.toBeInstanceOf(ApiError);
    await expect(read).rejects.toMatchObject({ body: { code: 'bad_response' } });
  });
});
