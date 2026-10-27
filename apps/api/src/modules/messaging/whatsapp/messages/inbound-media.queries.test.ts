import { PLAYABLE_MIMES } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { InboundMediaQueries, PLAYABLE_FILTER } from './inbound-media.queries';

const M = 'messages';

describe('InboundMediaQueries retention reads (owner 2026-10-19 #2)', () => {
  it('cachedBefore: inbound with a Meta media id, cached, audio / video only, older than the cutoff, oldest first', async () => {
    const rows = [
      { id: 'm1', media_path: 'm1.ogg', media_mime: 'audio/ogg; codecs=opus', media_id: 'wamid-1' },
      { id: 'm2', media_path: null, media_mime: 'video/mp4', media_id: 'wamid-2' },
    ];
    const { db, calls } = fakeDb({ [M]: [{ data: rows }] });
    const out = await new InboundMediaQueries(db).cachedBefore({ before: '2026-09-19T00:00:00.000Z', limit: 100 });
    expect(out).toEqual([rows[0]]);
    const of = (method: string) => calls.filter((c) => c.method === method).map((c) => c.args);
    expect(of('eq')).toEqual([['direction', 'inbound']]);
    // Never an old-CRM copy (no media id): our only copy once the CRM's storage is private (owner 2026-10-27).
    expect(of('not')).toEqual([['media_id', 'is', null], ['media_path', 'is', null]]);
    expect(of('select')).toEqual([['id, media_path, media_mime, media_id']]);
    expect(of('or')).toEqual([[PLAYABLE_FILTER]]);
    expect(of('lt')).toEqual([['created_at', '2026-09-19T00:00:00.000Z']]);
    expect(of('order')).toEqual([['created_at', { ascending: true }]]);
    expect(of('limit')).toEqual([[100]]);
  });

  it('the mime filter names every PLAYABLE_MIMES base type (params allowed) and no image or PDF', () => {
    const parts = PLAYABLE_FILTER.split(',');
    for (const m of PLAYABLE_MIMES) expect(parts).toEqual(expect.arrayContaining([`media_mime.ilike.${m}`, `media_mime.ilike.${m};*`]));
    expect(parts).toHaveLength(2 * PLAYABLE_MIMES.length);
    // A bare prefix also matched audio/mp4a-latm (not playable): the job skipped it forever.
    expect(parts.every((p) => !p.endsWith('*') || p.endsWith(';*'))).toBe(true);
    expect(PLAYABLE_FILTER).not.toMatch(/image|pdf/);
  });

  it('a read error throws', async () => {
    const { db } = fakeDb({ [M]: [{ error: { message: 'denied' } }] });
    await expect(new InboundMediaQueries(db).cachedBefore({ before: 'x', limit: 1 })).rejects.toThrow('denied');
  });

  it('clearPaths: media_path null for those ids, inbound only; no ids = no query', async () => {
    const { db, calls, argsOf } = fakeDb({ [M]: [{ data: null }] });
    const q = new InboundMediaQueries(db);
    await q.clearPaths(['m1', 'm2']);
    expect(argsOf(M, 'update')).toEqual([{ media_path: null }]);
    expect(argsOf(M, 'in')).toEqual(['id', ['m1', 'm2']]);
    expect(argsOf(M, 'eq')).toEqual(['direction', 'inbound']);
    expect(argsOf(M, 'not')).toEqual(['media_id', 'is', null]);
    const before = calls.length;
    await q.clearPaths([]);
    expect(calls).toHaveLength(before);
  });

  it('echoes: outbound with a media id and a cached copy, never a file staff sent (out/…)', async () => {
    const { db, calls } = fakeDb({ [M]: [{ data: [] }, { data: null }] });
    const q = new InboundMediaQueries(db);
    await q.cachedBefore({ before: '2026-09-19T00:00:00.000Z', limit: 100, echoes: true });
    await q.clearPaths(['m1'], true);
    const of = (method: string) => calls.filter((c) => c.method === method).map((c) => c.args);
    expect(of('eq')).toEqual([['direction', 'outbound'], ['direction', 'outbound']]);
    expect(of('not')).toEqual([
      ['media_id', 'is', null],
      ['media_path', 'like', 'out/%'],
      ['media_path', 'is', null],
      ['media_id', 'is', null],
      ['media_path', 'like', 'out/%'],
    ]);
  });
});
