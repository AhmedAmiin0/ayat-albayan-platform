import { describe, expect, it } from 'vitest';
import { fakeMoveDb, id, moveStores, RECEIPTS } from './move.fakes';
import { moveRow } from './row-move';

const row = { id: id(1), path: 's/a.pdf' };

async function setup(paths: Record<string, string | null> = { [row.id]: row.path }) {
  const fake = fakeMoveDb(paths);
  const s = await moveStores(['s/a.pdf']);
  return { ...fake, ...s, ctx: { db: fake.db, stores: s.stores, column: RECEIPTS } };
}

describe('moveRow (docs/45 §6)', () => {
  it('copies, verifies, then rewrites the row to minio:<key>', async () => {
    const { ctx, table, to } = await setup();
    expect(await moveRow(ctx, row)).toEqual({ outcome: 'rewritten', copied: true });
    expect(table.get(row.id)).toBe('minio:s/a.pdf');
    expect(await to.store.info({ bucket: 'receipts', key: 's/a.pdf' })).not.toBeNull();
  });

  it('compare-and-set: a row changed after it was read is never overwritten', async () => {
    const { ctx, table, hooks } = await setup();
    // A re-render / an edit writes the row between the copy and the rewrite.
    hooks.beforeRewrite = (r) => void table.set(r.id, 'minio:s/new.pdf');
    expect(await moveRow(ctx, row)).toEqual({ outcome: 'changed', copied: true });
    expect(table.get(row.id)).toBe('minio:s/new.pdf');
  });

  it('a missing Supabase object: reported, the row keeps its path, nothing in MinIO', async () => {
    const { ctx, table, to } = await setup({ [id(2)]: 's/gone.pdf' });
    const gone = { id: id(2), path: 's/gone.pdf' };
    expect(await moveRow(ctx, gone)).toEqual({ outcome: 'missing', copied: false });
    expect(table.get(id(2))).toBe('s/gone.pdf');
    expect(to.objects.size).toBe(0);
  });

  it('a size mismatch in MinIO: no rewrite', async () => {
    const { ctx, table, to } = await setup();
    const longer = new TextEncoder().encode('%PDF-1.7 something else entirely');
    await to.store.put({ bucket: 'receipts', key: 's/a.pdf', body: longer, contentType: 'application/pdf' });
    expect(await moveRow(ctx, row)).toEqual({ outcome: 'mismatch', copied: false });
    expect(table.get(row.id)).toBe('s/a.pdf');
  });

  it('an already marked row is skipped without touching either store', async () => {
    const { ctx, from, to } = await setup({ [row.id]: 'minio:s/a.pdf' });
    expect(await moveRow(ctx, { ...row, path: 'minio:s/a.pdf' })).toEqual({
      outcome: 'skipped',
      copied: false,
    });
    expect([from.sent.length, to.sent.length]).toEqual([1, 0]);
  });

  it('a store or database error is «failed», never thrown, and the row keeps its path', async () => {
    const { ctx, table } = await setup();
    ctx.db.rewrite = () => Promise.reject(new Error('payment frozen'));
    expect(await moveRow(ctx, row)).toEqual({ outcome: 'failed', copied: false });
    expect(table.get(row.id)).toBe('s/a.pdf');
  });
});
