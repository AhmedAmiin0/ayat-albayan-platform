import { describe, expect, it } from 'vitest';
import type { PlanWithChanges } from './changes.ts';
import { dropStaleRefs, findStale } from './stale-refs.ts';

const guardian = { entity: 'guardians' as const, key: '+966500000001' };
const lead = { entity: 'leads' as const, key: '+966500000002' };
const message = (key: string, refs: Record<string, typeof guardian>) => ({
  key: { entity: 'messages' as const, key },
  action: 'create' as const,
  targetId: null,
  hash: `h-${key}`,
  record: { columns: { body: key }, refs },
  ref: { source: 'crm', tab: 'messages', row: 1 },
});

const plan = {
  target: 'staging',
  createdAt: '2026-10-24T00:00:00Z',
  items: [message('m1', { guardian_id: guardian }), message('m2', { lead_id: lead })],
  issues: [],
  counts: {},
  changes: [],
} as unknown as PlanWithChanges;

const existing = new Map([
  ['guardians:+966500000001', { targetId: 'g-gone', hash: 'x' }],
  ['leads:+966500000002', { targetId: 'l-here', hash: 'y' }],
]);
const tableOf = (e: string) => e;

describe('findStale', () => {
  it('names refs whose target row is gone and reads NOT NULL columns only then', async () => {
    const queries: string[] = [];
    const db = {
      select: async <T extends object>(q: { text: string; params: unknown[] }) => {
        queries.push(q.text);
        if (q.text.includes('information_schema')) return [{ t: 'messages', c: 'phone_e164' }] as T[];
        return (q.text.includes('"leads"') ? [{ id: 'l-here' }] : []) as T[];
      },
    };
    const stale = await findStale({ db, plan, existing, tableOf });
    expect([...stale.missing]).toEqual(['guardians:+966500000001']);
    expect(stale.required.has('messages.phone_e164')).toBe(true);
    expect(queries).toHaveLength(3);
  });
});

describe('dropStaleRefs', () => {
  it('leaves a nullable stale ref empty and keeps live refs', () => {
    const stale = { missing: new Set(['guardians:+966500000001']), required: new Set<string>() };
    const out = dropStaleRefs({ plan, stale, tableOf });
    expect(out.plan.items.map((i) => [i.key.key, i.action, Object.keys(i.record.refs)])).toEqual([
      ['m1', 'create', []],
      ['m2', 'create', ['lead_id']],
    ]);
    expect([out.cleared, out.skipped]).toEqual([1, 0]);
  });

  it('skips a create whose stale ref is NOT NULL', () => {
    const stale = {
      missing: new Set(['guardians:+966500000001']),
      required: new Set(['messages.guardian_id']),
    };
    const out = dropStaleRefs({ plan, stale, tableOf });
    expect(out.plan.items[0]?.action).toBe('skip');
    expect([out.cleared, out.skipped]).toEqual([0, 1]);
    expect(out.plan.counts['messages']).toMatchObject({ create: 1, skip: 1 });
  });
});
