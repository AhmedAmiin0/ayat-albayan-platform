import { leadListItem } from '@ab/shared/testing';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { leadReadCalls } from '../leads-read-api';

const ITEM = leadListItem({ name: 'هدى' });
const PAGE = { items: [ITEM], total: 1, page: 1, pageSize: 25 };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('lead read calls', () => {
  it('reads the inbox page on the path of today, in the order the query was given', async () => {
    const { client, apiFetch } = clientAnswering(PAGE);
    const query = { page: 2, pageSize: 25, status: 'new', q: '0501', sort: 'name' } as const;
    await expect(leadReadCalls(client).list(query)).resolves.toEqual(PAGE);
    expect(apiFetch).toHaveBeenCalledWith('/leads?page=2&pageSize=25&status=new&q=0501&sort=name');
  });

  it('leaves out the filters that are not set', async () => {
    const { client, apiFetch } = clientAnswering(PAGE);
    await leadReadCalls(client).list({ page: 1, pageSize: 25, q: undefined });
    expect(apiFetch).toHaveBeenCalledWith('/leads?page=1&pageSize=25');
  });

  it('throws bad_response for a row with a status the catalogue does not know', async () => {
    const { client } = clientAnswering({ ...PAGE, items: [{ ...ITEM, status: 'gone' }] });
    const failure = await leadReadCalls(client)
      .list({})
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
