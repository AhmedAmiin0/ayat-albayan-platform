import { describe, expect, it } from 'vitest';
import { mockCall } from '..';

describe('mockCall requests', () => {
  it('records every request as an object, reads and writes apart', async () => {
    const api = mockCall();
    await api.call({ path: '/a' });
    await api.call({ method: 'POST', path: '/b', body: { n: 1 } });
    const list = { method: 'GET', path: '/links' };
    await api.call({ route: list, query: { search: 'نور', page: 2, empty: '', none: null } });
    await api.call({ route: list, query: { active: true } });
    expect(api.requests()).toEqual([
      { method: 'GET', path: '/a' },
      { method: 'POST', path: '/b', body: { n: 1 } },
      { method: 'GET', path: '/links?search=%D9%86%D9%88%D8%B1&page=2' },
      { method: 'GET', path: '/links?active=true' },
    ]);
    expect(api.reads().map((r) => r.path)).toEqual(['/a', expect.any(String), expect.any(String)]);
    expect(api.writes()).toEqual([{ method: 'POST', path: '/b', body: { n: 1 } }]);
  });

  it('clears the requests of one kind, or all', async () => {
    const api = mockCall();
    await api.call({ path: '/a' });
    await api.call({ method: 'POST', path: '/b' });
    api.clear('read');
    expect(api.requests()).toEqual([{ method: 'POST', path: '/b' }]);
    api.clear();
    expect(api.requests()).toEqual([]);
  });

  it('resets one kind: its requests, answers and handler go, the other kind stays', async () => {
    const api = mockCall();
    api.answer('GET', '/a', 1);
    api.onWrite(() => 2);
    await api.call({ path: '/a' });
    api.reset('read');
    await expect(api.call({ path: '/a' })).resolves.toBeUndefined();
    await expect(api.call({ method: 'POST', path: '/b' })).resolves.toBe(2);
    api.reset();
    await expect(api.call({ method: 'POST', path: '/b' })).resolves.toBeUndefined();
    expect(api.requests()).toEqual([{ method: 'POST', path: '/b' }]);
  });
});
