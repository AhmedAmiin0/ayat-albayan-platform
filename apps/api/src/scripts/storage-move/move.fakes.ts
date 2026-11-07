import { MINIO_MARK } from '@ab/shared';
import { fakeS3 } from '@/common/storage/store/s3.fakes';
import type { PathColumn } from './columns';
import type { BatchAudit, MoveDb, PathRow } from './move-db';

// Test helper (not a test): one in-memory table of id → path, and the two stores.

export const RECEIPTS: PathColumn = { table: 'payments', column: 'receipt_path', bucket: 'receipts' };

export const id = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export function fakeMoveDb(rows: Record<string, string | null>) {
  const table = new Map(Object.entries(rows));
  const audits: BatchAudit[] = [];
  const hooks = { beforeRewrite: (_row: PathRow): void => undefined };
  const unmarked = (path: string | null): path is string =>
    path !== null && !path.startsWith(MINIO_MARK);
  const db: MoveDb = {
    page: ({ after, limit }) =>
      Promise.resolve(
        [...table]
          .flatMap(([k, path]) => (unmarked(path) && k > after ? [{ id: k, path }] : []))
          .sort((a, b) => a.id.localeCompare(b.id))
          .slice(0, limit),
      ),
    count: ({ marked }) =>
      Promise.resolve(
        [...table.values()].filter((p) => p !== null && unmarked(p) !== marked).length,
      ),
    rewrite: ({ row, to }) => {
      hooks.beforeRewrite(row);
      const held = table.get(row.id) === row.path;
      if (held) table.set(row.id, to);
      return Promise.resolve(held);
    },
    audit: (entry) => {
      audits.push(entry);
      return Promise.resolve();
    },
  };
  return { db, table, audits, hooks };
}

const PDF = new TextEncoder().encode('%PDF-1.7 receipt');

export async function moveStores(keys: readonly string[]) {
  const from = fakeS3();
  const to = fakeS3();
  for (const key of keys)
    await from.store.put({ bucket: 'receipts', key, body: PDF, contentType: 'application/pdf' });
  return { from, to, stores: { from: from.store, to: to.store, maxBytes: 1024 } };
}
