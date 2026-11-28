import { defineRoute } from '@ab/core';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { z } from 'zod';
import { listKey, pathKey, routeQuery, type ApiRequest } from '../../../..';

const note = z.object({ id: z.string(), text: z.string() });
const notes = defineRoute({
  method: 'GET',
  path: '/students/:id/notes',
  params: z.object({ id: z.string() }),
  query: z.object({ page: z.number().optional(), q: z.string().optional() }),
  response: z.array(note),
});
const me = defineRoute({ method: 'GET', path: '/auth/me', response: note });
const rows = [{ id: 'n1', text: 'حفظ جديد' }];

const answering = (body: unknown) => ({ request: vi.fn(async (_: ApiRequest) => body) });

describe('routeQuery', () => {
  it('keys the entry by the route key and the input', () => {
    const query = routeQuery(answering(rows), notes, { id: 's1', page: 2 });
    expect(query.queryKey).toEqual(['students', ':id', 'notes', { id: 's1', page: 2 }]);
    expect(query.queryKey).toEqual(notes.key.of({ id: 's1', page: 2 }));
  });

  it('calls the route: params fill the path, the rest is the query', async () => {
    const client = answering(rows);
    const signal = new AbortController().signal;
    await expect(
      routeQuery(client, notes, { id: 's 1', q: 'x' }).queryFn({ signal }),
    ).resolves.toEqual(rows);
    expect(client.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/students/s%201/notes?q=x',
      signal,
    });
  });

  it('calls a route without inputs on its bare path, with no signal unless given', async () => {
    const client = answering(rows[0]);
    await routeQuery(client, me, {}).queryFn();
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', path: '/auth/me' });
  });

  it('parses the answer with the route schema and refuses another shape', async () => {
    const failure = await routeQuery(answering([{ id: 1 }]), notes, { id: 's1' })
      .queryFn()
      .catch((e: unknown) => e);
    expect(failure).toMatchObject({ body: { code: 'bad_response', path: '/students/s1/notes' } });
  });

  it('types the answer by the route response schema', () => {
    const query = routeQuery(answering(rows), notes, { id: 's1' });
    expectTypeOf(query.queryFn).returns.resolves.toEqualTypeOf<{ id: string; text: string }[]>();
  });

  it('is what the path-key convention gives, so the old invalidations still reach it', async () => {
    expect(me.key.all).toEqual(pathKey(me.path));
    const cache = new QueryClient();
    const query = routeQuery(answering(rows), notes, { id: 's1' });
    cache.setQueryData(query.queryKey, rows);
    cache.setQueryData(listKey('/students'), []);
    await cache.invalidateQueries({ queryKey: notes.key.all });
    expect(cache.getQueryState(query.queryKey)?.isInvalidated).toBe(true);
    expect(cache.getQueryState(listKey('/students'))?.isInvalidated).toBe(false);
  });
});
