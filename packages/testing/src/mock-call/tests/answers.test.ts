import { describe, expect, it } from 'vitest';
import { mockCall } from '..';

describe('mockCall answers', () => {
  it('answers a path-form read set per method and path', async () => {
    const api = mockCall();
    api.answer('GET', '/students', [{ id: 's1' }]);
    await expect(api.call({ path: '/students' })).resolves.toEqual([{ id: 's1' }]);
    await expect(api.call({ method: 'POST', path: '/students' })).resolves.toBeUndefined();
  });

  it('answers a route-form call by its method and filled path', async () => {
    const api = mockCall();
    api.answer('PATCH', '/links/a%2Fb', { ok: true });
    const route = { method: 'PATCH', path: '/links/:code' };
    const sent = api.call({ route, params: { code: 'a/b' }, body: { title: 'x' } });
    await expect(sent).resolves.toEqual({ ok: true });
  });

  it('prefers the answer for the full path, then the one without the query', async () => {
    const api = mockCall();
    api.answer('GET', '/leads', 'any page');
    api.answer('GET', '/leads?page=2', 'page 2');
    await expect(api.call({ path: '/leads?page=2' })).resolves.toBe('page 2');
    await expect(api.call({ path: '/leads?page=3' })).resolves.toBe('any page');
  });

  it('falls back to the read or write handler with the request it saw', async () => {
    const api = mockCall();
    api.onRead(({ path }) => `read ${path}`);
    api.onWrite(({ method, body }) => ({ method, body }));
    await expect(api.call({ path: '/x' })).resolves.toBe('read /x');
    await expect(api.call({ method: 'PUT', path: '/x', body: 1 })).resolves.toEqual({
      method: 'PUT',
      body: 1,
    });
  });

  it('rejects when a handler throws or rejects', async () => {
    const api = mockCall();
    api.onRead(() => {
      throw new Error('offline');
    });
    api.onWrite(() => Promise.reject(new Error('refused')));
    await expect(api.call({ path: '/x' })).rejects.toThrow('offline');
    await expect(api.call({ method: 'DELETE', path: '/x' })).rejects.toThrow('refused');
  });

  it('rejects a request that is neither form', async () => {
    const api = mockCall();
    await expect(api.call({ url: '/x' })).rejects.toThrow();
    expect(api.requests()).toEqual([]);
  });
});
