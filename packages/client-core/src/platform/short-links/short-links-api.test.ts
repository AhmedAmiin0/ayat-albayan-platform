import { shortLinkDetailSchema, shortLinkPageSchema } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';
import { ApiError, parseResponse, type ApiClient } from '../../core/http';
import { SHORT_LINK_GATE_KEY, SHORT_LINKS_KEY, shortLinkQueries } from './short-links-api';
import { detail, gateView, person } from './short-links.test-util';

const clientAnswering = (answer: () => Promise<unknown>) => {
  const read = async (path: string, init?: { schema?: z.ZodType }) =>
    init?.schema ? parseResponse(init.schema, await answer(), path) : answer();
  return { apiFetch: vi.fn(read), apiSend: vi.fn() } as unknown as ApiClient;
};

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
      { schema: shortLinkPageSchema },
    );
  });

  it('reads one link under the same key', async () => {
    const client = clientAnswering(async () => detail);
    const q = shortLinkQueries(client).detailQuery('K7q2M9xT');
    expect(q.queryKey).toEqual(['short-links', 'K7q2M9xT']);
    await expect(q.queryFn()).resolves.toEqual(detail);
    expect(client.apiFetch).toHaveBeenCalledWith('/short-links/K7q2M9xT', {
      schema: shortLinkDetailSchema,
    });
  });

  it('rejects an answer that does not match the schema', async () => {
    const client = clientAnswering(async () => ({ rows: 'x' }));
    await expect(shortLinkQueries(client).listQuery({}).queryFn()).rejects.toThrow(ApiError);
  });

  it('searches people from two characters, trimmed', async () => {
    const client = clientAnswering(async () => [person]);
    const { peopleQuery } = shortLinkQueries(client);
    expect(peopleQuery(' أ ').enabled).toBe(false);
    const q = peopleQuery(' أحمد ');
    expect(q.enabled).toBe(true);
    expect(q.queryKey).toEqual(['short-links', 'people', 'أحمد']);
    await expect(q.queryFn()).resolves.toEqual([person]);
    expect(vi.mocked(client.apiFetch).mock.calls[0]?.[0]).toBe(
      `/short-links/people?search=${encodeURIComponent('أحمد')}`,
    );
  });
});

describe('the gate view', () => {
  it('answers the parsed view', async () => {
    const client = clientAnswering(async () => gateView);
    const q = shortLinkQueries(client).gateViewQuery('K7q2M9xT');
    expect(q.queryKey).toEqual([...SHORT_LINK_GATE_KEY, 'K7q2M9xT']);
    await expect(q.queryFn()).resolves.toEqual({ kind: 'view', view: gateView });
    expect(client.apiFetch).toHaveBeenCalledWith('/public/short-links/K7q2M9xT');
  });

  it('turns a 404 into not_found', async () => {
    const client = clientAnswering(async () => {
      throw new ApiError(404, { code: 'short_link_not_found' });
    });
    await expect(shortLinkQueries(client).gateViewQuery('K7q2M9xT').queryFn()).resolves.toEqual({
      kind: 'not_found',
    });
  });

  it('never asks for a malformed code', async () => {
    const client = clientAnswering(async () => gateView);
    const q = shortLinkQueries(client).gateViewQuery('bad/code');
    await expect(q.queryFn()).resolves.toEqual({ kind: 'not_found' });
    expect(client.apiFetch).not.toHaveBeenCalled();
  });

  it('keeps any other failure an error', async () => {
    const client = clientAnswering(async () => {
      throw new ApiError(500);
    });
    await expect(shortLinkQueries(client).gateViewQuery('K7q2M9xT').queryFn()).rejects.toThrow(
      'API 500',
    );
  });
});
