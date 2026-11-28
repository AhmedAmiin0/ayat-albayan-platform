import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { SHORT_LINKS_KEY, shortLinkQueries } from '../short-links-api';
import { detail, person } from '../../short-links.test-util';

const clientAnswering = (answer: () => Promise<unknown>) =>
  ({ apiFetch: vi.fn(answer), apiSend: vi.fn() }) as unknown as ApiClient;

describe('short link reads', () => {
  it('lists with the filters in the key and the query string', async () => {
    const client = clientAnswering(async () => ({ rows: [detail], total: 1 }));
    const q = shortLinkQueries(client).listQuery({ status: 'active', search: 'لقاء', page: 2 });
    const filter = { status: 'active', search: 'لقاء', page: 2 };
    expect(q.queryKey).toEqual(['short-links', 'list', filter]);
    expect(q.queryKey.slice(0, 1)).toEqual(SHORT_LINKS_KEY);
    await expect(q.queryFn()).resolves.toMatchObject({ total: 1 });
    expect(client.apiFetch).toHaveBeenCalledWith(
      '/short-links?status=active&search=%D9%84%D9%82%D8%A7%D8%A1&page=2',
    );
  });

  it('reads one link under the same key', async () => {
    const client = clientAnswering(async () => detail);
    const q = shortLinkQueries(client).detailQuery('K7q2M9xT');
    expect(q.queryKey).toEqual(['short-links', 'K7q2M9xT']);
    await expect(q.queryFn()).resolves.toEqual(detail);
    expect(client.apiFetch).toHaveBeenCalledWith('/short-links/K7q2M9xT');
  });

  it('rejects an answer that does not match the schema', async () => {
    const client = clientAnswering(async () => ({ rows: 'x' }));
    await expect(shortLinkQueries(client).listQuery({}).queryFn()).rejects.toThrow();
  });

  it('searches people from two characters, trimmed', async () => {
    const client = clientAnswering(async () => [person]);
    const { peopleQuery } = shortLinkQueries(client);
    expect(peopleQuery(' أ ').enabled).toBe(false);
    const q = peopleQuery(' أحمد ');
    expect(q.enabled).toBe(true);
    expect(q.queryKey).toEqual(['short-links', 'people', 'أحمد']);
    await expect(q.queryFn()).resolves.toEqual([person]);
    expect(client.apiFetch).toHaveBeenCalledWith(
      `/short-links/people?search=${encodeURIComponent('أحمد')}`,
    );
  });
});
