import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { PdfPreviewRepo } from './pdf-preview.repo';

const M = 'messages';

describe('PdfPreviewQueries (migration 20261030000982)', () => {
  it('doc: null until probed; 0 pages is a stored «no preview», not «not probed»', async () => {
    const { db, argsOf } = fakeDb({
      [M]: [{ data: { media_pages: null, media_bytes: null } }, { data: { media_pages: 0, media_bytes: 512 } }, { data: null }],
    });
    const q = new PdfPreviewRepo(db);
    await expect(q.doc('m1')).resolves.toBeNull();
    await expect(q.doc('m1')).resolves.toEqual({ pages: 0, bytes: 512 });
    await expect(q.doc('m1')).resolves.toBeNull();
    // Its own select: InboundMediaQueries' shared COLUMNS never name the new columns.
    expect(argsOf(M, 'select')).toEqual(['media_pages, media_bytes']);
  });

  it('setDoc writes only where nothing is stored yet (the first writer wins)', async () => {
    const { db, calls } = fakeDb({ [M]: [{ data: null }] });
    await new PdfPreviewRepo(db).setDoc('m1', { pages: 12, bytes: 1_234 });
    const of = (method: string) => calls.filter((c) => c.method === method).map((c) => c.args);
    expect(of('update')).toEqual([[{ media_pages: 12, media_bytes: 1_234 }]]);
    expect([of('eq'), of('is')]).toEqual([[['id', 'm1']], [['media_pages', null]]]);
  });

  it('a DB error throws', async () => {
    const { db } = fakeDb({ [M]: [{ error: { message: 'denied' } }] });
    await expect(new PdfPreviewRepo(db).doc('m1')).rejects.toThrow('denied');
  });
});
