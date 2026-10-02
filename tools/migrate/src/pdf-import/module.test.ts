// writeReportPdf: upload to reports/{student_id}/{lesson_id}.pdf, then mark the report ready.
import { describe, expect, it } from 'vitest';
import type { WriteContext } from '../entities/contract.ts';
import type { TargetStorage } from '../db/storage.ts';
import { keys } from '../keys.ts';
import { fakeDb } from '../plan/fake-db.ts';
import { writeReportPdf } from './module.ts';

function ctx(o: { storage?: TargetStorage; bytes?: Uint8Array }) {
  const f = fakeDb();
  const run = () =>
    f.db.transaction(async (t) => {
      const c: WriteContext = {
        tx: t,
        item: {
          key: keys.reportPdf('l|s'),
          action: 'create',
          targetId: null,
          hash: 'h',
          record: { columns: {}, refs: {} },
          ref: { source: 'ATT', tab: 'zip', row: 4 },
        },
        columns: { zip_path: 'z.pdf', report_id: 'r-1', student_id: 's-1', lesson_id: 'l-1' },
        storage: o.storage,
        readZipEntry: (p) => (p === 'z.pdf' ? o.bytes : undefined),
      };
      return writeReportPdf(c);
    });
  return { f, run };
}

describe('writeReportPdf', () => {
  it('uploads the zip entry and points the report at it', async () => {
    const uploads: string[] = [];
    const storage: TargetStorage = {
      upload: async (u) => {
        uploads.push(`${u.bucket}/${u.path} ${u.contentType} ${u.bytes.length}`);
        return true;
      },
    };
    const c = ctx({ storage, bytes: new Uint8Array([1, 2, 3]) });
    expect(await c.run()).toEqual({ targetId: null, targetPath: 'reports/s-1/l-1.pdf' });
    expect(uploads).toEqual(['reports/s-1/l-1.pdf application/pdf 3']);
    expect(c.f.log).toEqual([
      'update lesson_reports r-1 {"pdf_path":"s-1/l-1.pdf","pdf_status":"ready","pdf_error":null}',
    ]);
  });

  it('fails loudly without Storage or without the zip entry', async () => {
    await expect(ctx({ bytes: new Uint8Array([1]) }).run()).rejects.toThrow(/Storage/);
    const storage: TargetStorage = { upload: async () => true };
    await expect(ctx({ storage }).run()).rejects.toThrow(/not in the zip/);
  });
});
