import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { walkRoutes } from '@/common/auth/parity/route-walk.test-util';
import { compareBaseline, ownedRoutes } from './owned-routes.test-util';
import { ownershipBaseline, UNCHECKED, type OwnershipBaseline } from './ownership.schemas';

// The API reads with the service-role client, so only the handler keeps a teacher, family or
// sales login to its own rows (audit OPS-9). Every id route such a login can call is listed in
// refactor/guards/ownership.json with the test that sends it someone else's id; guard:ownership
// keeps the «unchecked» entries from growing.
const ROOT = join(__dirname, '../../../../../..');
const BASELINE = join(ROOT, 'refactor/guards/ownership.json');

const readBaseline = (): OwnershipBaseline =>
  ownershipBaseline.parse(JSON.parse(readFileSync(BASELINE, 'utf8')));

describe('ownership baseline', () => {
  let owned: string[];
  let baseline: OwnershipBaseline;
  beforeAll(async () => {
    owned = ownedRoutes(await walkRoutes());
    baseline = readBaseline();
  }, 60_000);

  it('finds the scoped id routes', () => {
    expect(owned.length).toBeGreaterThan(100);
  });

  it('lists every scoped id route, and only those', () => {
    const { added, stale } = compareBaseline(owned, baseline);
    expect({ added, stale }, 'add a foreign-id test and list it in ownership.json').toEqual({
      added: [],
      stale: [],
    });
  });

  it('points every checked route at a test file that exists', () => {
    const files = Object.values(baseline).filter((v) => v !== UNCHECKED);
    expect(files.filter((f) => !existsSync(join(ROOT, f)))).toEqual([]);
  });

  it('keeps the file sorted, so a diff shows one line per route', () => {
    const keys = Object.keys(baseline);
    expect(keys).toEqual([...keys].sort());
  });
});
