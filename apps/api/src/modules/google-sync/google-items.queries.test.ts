import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../common/db/db.module';
import { GoogleItemsQueries } from './google-items.queries';
import { item } from './google-sync.fakes';

describe('GoogleItemsQueries.claim', () => {
  it('hands a pass its items events → PDF → attendance → summary, whatever order RETURNING gave', async () => {
    const rows = [item({ id: 's', kind: 'summary_row' }), item({ id: 'a', kind: 'attendance_row' }), item({ id: 'p', kind: 'report_pdf' }), item({ id: 'e', kind: 'main_event' })];
    const db = { rpc: vi.fn().mockResolvedValue({ data: rows, error: null }) };
    const claimed = await new GoogleItemsQueries(db as unknown as Db).claim(25);
    expect(claimed.map((r) => r.id)).toEqual(['e', 'p', 'a', 's']);
    expect(db.rpc).toHaveBeenCalledWith('google_sync_claim', expect.objectContaining({ p_limit: 25 }));
  });
});
