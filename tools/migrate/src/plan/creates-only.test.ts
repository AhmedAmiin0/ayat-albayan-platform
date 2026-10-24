import { describe, expect, it } from 'vitest';
import type { PlanWithChanges } from './changes.ts';
import { createsOnly } from './creates-only.ts';

const item = (key: string, action: 'create' | 'update' | 'adopt' | 'skip') => ({
  key: { entity: 'leads' as const, key },
  action,
  targetId: action === 'create' ? null : `id-${key}`,
  hash: `h-${key}`,
  record: { columns: { name: key }, refs: {} },
  ref: { source: 'crm', tab: 'contacts', row: 1 },
});

const plan = {
  target: 'staging',
  createdAt: '2026-10-24T00:00:00Z',
  items: [
    item('new', 'create'),
    item('edited', 'update'),
    item('app', 'adopt'),
    item('same', 'skip'),
  ],
  issues: [],
  counts: {},
  changes: [
    {
      entity: 'leads',
      key: 'edited',
      ref: { source: 'crm', tab: 'contacts', row: 1 },
      field: 'status',
      from: 'contacted',
      to: 'new',
    },
  ],
} as unknown as PlanWithChanges;

describe('createsOnly', () => {
  it('turns every update into a skip and keeps creates, adopts and target ids', () => {
    const out = createsOnly(plan);
    expect(out.items.map((i) => [i.key.key, i.action, i.targetId])).toEqual([
      ['new', 'create', null],
      ['edited', 'skip', 'id-edited'],
      ['app', 'adopt', 'id-app'],
      ['same', 'skip', 'id-same'],
    ]);
    expect(out.changes).toEqual([]);
    expect(out.counts['leads']).toMatchObject({ create: 1, update: 0, adopt: 1, skip: 2 });
  });

  it('leaves the input plan unchanged', () => {
    createsOnly(plan);
    expect(plan.items[1]?.action).toBe('update');
  });
});
