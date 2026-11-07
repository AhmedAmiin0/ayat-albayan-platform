import { describe, expect, it } from 'vitest';
import { fakeMoveDb, id, moveStores, RECEIPTS } from './move.fakes';
import { surveyColumns } from './survey';

describe('surveyColumns: the dry run (docs/45 §6)', () => {
  it('counts and samples, and writes nothing anywhere', async () => {
    const fake = fakeMoveDb({ [id(1)]: 's/a.pdf', [id(2)]: 's/gone.pdf', [id(3)]: 'minio:s/c.pdf' });
    const s = await moveStores(['s/a.pdf']);
    const out = await surveyColumns({
      db: fake.db,
      from: s.from.store,
      to: s.to.store,
      columns: [RECEIPTS],
      sample: 5,
    });
    expect(out).toEqual({
      mode: 'dry-run',
      columns: [
        {
          table: 'payments',
          column: 'receipt_path',
          bucket: 'receipts',
          inMinio: 1,
          toMove: 2,
          sample: [
            { id: id(1), inSupabase: true, inMinioAlready: false },
            { id: id(2), inSupabase: false, inMinioAlready: false },
          ],
        },
      ],
    });
    expect([s.to.objects.size, fake.audits.length]).toEqual([0, 0]);
    expect(fake.table.get(id(1))).toBe('s/a.pdf');
  });
});
