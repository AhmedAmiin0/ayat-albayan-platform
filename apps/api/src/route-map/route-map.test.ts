import { describe, expect, it } from 'vitest';
import { routeMap } from './route-map.test-util';

// A module split moves controllers between @Modules, never a route: same method, path, auth,
// guards and status code. routes.snap.txt changes only with a PR that adds or changes a route.
describe('the API route map', () => {
  it('matches the committed snapshot, one line per route', async () => {
    const lines = await routeMap();
    expect(new Set(lines).size).toBe(lines.length);
    await expect(`${lines.join('\n')}\n`).toMatchFileSnapshot('./routes.snap.txt');
  }, 60_000);
});
