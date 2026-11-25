import { afterEach, describe, expect, it } from 'vitest';
import { controlRoutes } from './control.ts';
import { closeAll, startStub } from './test-server.ts';

afterEach(closeAll);

const health = controlRoutes.find(
  ([method, path]) => method === 'GET' && path.test('/__stub/health'),
);

describe('wa-stub: route handlers', () => {
  it('a handler with nothing to wait for is a plain function, not an async one', () => {
    expect(health?.[2].constructor.name).toBe('Function');
  });

  it('the server still serves a handler that answers at once', async () => {
    const { url } = await startStub({});
    const res = await fetch(`${url}/__stub/health`);
    expect([res.status, await res.json()]).toEqual([200, { ok: true }]);
  });
});
