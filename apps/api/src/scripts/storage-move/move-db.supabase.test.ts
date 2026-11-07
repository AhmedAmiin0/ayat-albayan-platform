import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { RECEIPTS } from './move.fakes';
import { MoveRepo } from './move-db.supabase';

// The PostgREST requests the repo sends (a fetch stub; no network).

const ROW = '00000000-0000-4000-8000-000000000001';

function repoWith(body: unknown, headers: Record<string, string> = {}) {
  const urls: { method: string; url: string; body: string }[] = [];
  const fetch = (url: string | Request | URL, init?: RequestInit): Promise<Response> => {
    const sent = typeof init?.body === 'string' ? init.body : '';
    urls.push({ method: init?.method ?? 'GET', url: decodeURIComponent(url instanceof Request ? url.url : String(url)), body: sent });
    const h = { 'content-type': 'application/json', ...headers };
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: h }));
  };
  const db = createClient('http://db.test', 'k', { global: { fetch } });
  return { repo: new MoveRepo(db), urls };
}

describe('MoveRepo (PostgREST)', () => {
  it('pages unmarked, non-null paths after the cursor, by id', async () => {
    const { repo, urls } = repoWith([{ id: ROW, path: 's/a.pdf' }]);
    const rows = await repo.page({ column: RECEIPTS, after: ROW, limit: 10 });
    expect(rows).toEqual([{ id: ROW, path: 's/a.pdf' }]);
    expect(urls[0]?.url).toContain('/payments?select=id,path:receipt_path');
    expect(urls[0]?.url).toContain('receipt_path=not.is.null&receipt_path=not.like.minio:%');
    expect(urls[0]?.url).toContain(`id=gt.${ROW}&order=id.asc&limit=10`);
  });

  it('rewrites with a compare-and-set on the old path', async () => {
    const { repo, urls } = repoWith([{ id: ROW }]);
    const row = { id: ROW, path: 's/a.pdf' };
    expect(await repo.rewrite({ column: RECEIPTS, row, to: 'minio:s/a.pdf' })).toBe(true);
    expect(urls[0]).toMatchObject({ method: 'PATCH', body: '{"receipt_path":"minio:s/a.pdf"}' });
    expect(urls[0]?.url).toContain(`id=eq.${ROW}&receipt_path=eq.s/a.pdf`);
  });

  it('a row that changed meanwhile updates nothing: false', async () => {
    const { repo } = repoWith([]);
    const row = { id: ROW, path: 's/a.pdf' };
    expect(await repo.rewrite({ column: RECEIPTS, row, to: 'minio:s/a.pdf' })).toBe(false);
  });

  it('counts marked rows', async () => {
    const { repo, urls } = repoWith(null, { 'content-range': '*/7' });
    expect(await repo.count({ column: RECEIPTS, marked: true })).toBe(7);
    expect(urls[0]?.url).toContain('receipt_path=like.minio:%');
  });

  it('one audit_log row per batch, with the old paths for a rollback', async () => {
    const { repo, urls } = repoWith(null);
    const rewritten = [{ id: ROW, path: 's/a.pdf' }];
    await repo.audit({ column: RECEIPTS, firstId: ROW, rewritten, counts: { rewritten: 1 } });
    expect(urls[0]?.url).toContain('/audit_log');
    expect(JSON.parse(urls[0]?.body ?? '{}')).toMatchObject({
      entity: 'storage_move',
      entity_id: ROW,
      before: { table: 'payments', column: 'receipt_path', rows: rewritten },
    });
  });
});
