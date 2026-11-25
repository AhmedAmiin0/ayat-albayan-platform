import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { walkRoutes } from '@/common/auth/parity/route-walk.test-util';
import { compareRouteMap, ownedRoutes, scopedPermissions } from './owned-routes.test-util';
import { ownedRouteTests, type OwnedRouteTests } from './ownership.schemas';

// The API reads with the service-role client, so only the handler keeps a teacher, family or
// sales login to its own rows (audit OPS-9). Every id route such a login can call maps in
// owned-routes.json to the test that sends it someone else's id; pnpm guard:ownership checks
// that each mapped test exists and asserts a 403 or 404.
const readMap = (): OwnedRouteTests =>
  ownedRouteTests.parse(JSON.parse(readFileSync(join(__dirname, 'owned-routes.json'), 'utf8')));

describe('owned id routes', () => {
  let owned: string[];
  let map: OwnedRouteTests;
  beforeAll(async () => {
    owned = ownedRoutes(await walkRoutes(), await scopedPermissions());
    map = readMap();
  }, 60_000);

  it('finds the scoped id routes', () => {
    expect(owned.length).toBeGreaterThan(100);
  });

  it('maps every scoped id route to its foreign-id test, and lists no other route', () => {
    const { unmapped, stale } = compareRouteMap(owned, map);
    expect({ unmapped, stale }, 'write a foreign-id test and map it in owned-routes.json').toEqual({
      unmapped: [],
      stale: [],
    });
  });

  it('keeps the file sorted, so a diff shows one line per route', () => {
    const keys = Object.keys(map);
    expect(keys).toEqual([...keys].sort());
  });
});
