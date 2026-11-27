import { describe, expect, it } from 'vitest';
import { numberTemplatesRoutes as routes } from '..';

const ID = '6f1c2a40-0b7e-4c2f-9d1a-3e5b7c9d1f20';
const SYNCED = {
  number_id: ID,
  ok: true,
  checked_at: '2026-11-27T10:00:00.000Z',
  meta_count: 4,
  synced: 3,
  number_ids: [ID],
};

describe('numberTemplatesRoutes', () => {
  it('keeps the path of today, for template managers only, tagged messaging', () => {
    expect(`${routes.sync.method} ${routes.sync.path}`).toBe('POST /admin/numbers/:id/templates/sync');
    expect(routes.sync.permissions).toEqual(['templates.manage']);
    expect(routes.sync.tags).toEqual(['messaging']);
  });

  it('takes a uuid id', () => {
    expect(routes.sync.params.safeParse({ id: 'num-1' }).success).toBe(false);
    expect(routes.sync.params.parse({ id: ID })).toEqual({ id: ID });
  });

  it('answers a sync, a failed one with its code, and a line sync with its line', () => {
    const failed = { ...SYNCED, ok: false, error: 'meta_error', message: 'x', synced: 0 };
    const line = { ...SYNCED, line: 'chat' };
    const all = [SYNCED, failed, line];
    expect(all.map((v) => routes.sync.response.parse(v))).toEqual(all);
  });

  it('refuses a line it does not know or a count below zero', () => {
    const bad = [{ ...SYNCED, line: 'sales' }, { ...SYNCED, synced: -1 }, { ...SYNCED, ok: 'yes' }];
    expect(bad.filter((v) => routes.sync.response.safeParse(v).success)).toEqual([]);
  });
});
