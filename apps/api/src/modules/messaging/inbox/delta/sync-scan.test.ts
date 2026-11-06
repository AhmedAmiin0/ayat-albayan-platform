import { describe, expect, it } from 'vitest';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { syncScan } from './sync-scan';

const id = (n: number) => `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const at = (us: number) => `2026-11-06T10:00:00.${String(us).padStart(6, '0')}+00:00`;
const row = (n: number, us: number) => messageRow({ id: id(n), updated_at: at(us) });
const tomb = (n: number, us: number) => ({
  id: id(n),
  phone_e164: '+966500000001',
  deleted_at: at(us),
});

describe('syncScan (live rows and tombstones, one keyset page)', () => {
  it('merges by (stamp, id) to the microsecond; ties go by id', () => {
    const s = syncScan({ rows: [row(1, 2), row(3, 5)], tombstones: [tomb(2, 2), tomb(4, 3)] }, 10);
    expect(s.rows.map((r) => r.id)).toEqual([id(1), id(3)]);
    expect(s.deleted).toEqual([id(2), id(4)]);
    expect(s).toMatchObject({ last: { at: at(5), id: id(3) }, more: false });
  });

  it('the first `limit` of the union; anything past it is more (the cursor stops at the page tail)', () => {
    const s = syncScan({ rows: [row(1, 1), row(3, 3)], tombstones: [tomb(2, 2)] }, 2);
    expect([s.rows.map((r) => r.id), s.deleted, s.more]).toEqual([[id(1)], [id(2)], true]);
    expect(s.last).toEqual({ at: at(2), id: id(2) });
  });

  it('nothing scanned: no cursor', () => {
    expect(syncScan({ rows: [], tombstones: [] }, 5)).toEqual({
      rows: [],
      deleted: [],
      last: null,
      more: false,
    });
  });
});
