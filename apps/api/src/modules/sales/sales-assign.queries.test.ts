import { describe, expect, it } from 'vitest';
import { SalesAssignQueries } from './sales-assign.queries';

/** A PostgREST-like builder that records every filter and resolves to `result` when awaited or on maybeSingle(). */
function recorder(result: { data: unknown; error: null }) {
  const calls: [string, ...unknown[]][] = [];
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => resolve(result),
    maybeSingle: () => Promise.resolve(result),
  };
  for (const name of ['select', 'eq', 'is', 'order']) {
    chain[name] = (...args: unknown[]) => {
      calls.push([name, ...args]);
      return chain;
    };
  }
  return { calls, db: { from: () => chain } };
}

describe('SalesAssignQueries: a disabled assistant is not a salesperson', () => {
  it('salespeople() asks only for active profiles of the sales role', async () => {
    const r = recorder({ data: [{ id: 'a', full_name: 'A' }], error: null });
    await new SalesAssignQueries(r.db as never).salespeople();
    expect(r.calls).toContainEqual(['eq', 'role', 'sales']);
    expect(r.calls).toContainEqual(['is', 'disabled_at', null]);
  });

  it('isSalesperson() refuses a disabled login (explicit assignment)', async () => {
    const r = recorder({ data: null, error: null });
    expect(await new SalesAssignQueries(r.db as never).isSalesperson('x')).toBe(false);
    expect(r.calls).toContainEqual(['is', 'disabled_at', null]);
  });
});
