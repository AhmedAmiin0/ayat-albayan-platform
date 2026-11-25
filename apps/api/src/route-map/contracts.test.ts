import { describe, expect, it } from 'vitest';
import { contractMap } from './contracts.test-util';

// docs/62 part 1 §5: moving a schema into a package, or a route onto a route object, leaves each
// route's JSON schema as it was; this file changes only with a PR that changes a contract.
describe('the API contract map', () => {
  it('matches the committed snapshot, one entry per route that declares a schema', async () => {
    const map = await contractMap();
    await expect(`${JSON.stringify(map, null, 1)}\n`).toMatchFileSnapshot('./contracts.snap.json');
  }, 60_000);
});
