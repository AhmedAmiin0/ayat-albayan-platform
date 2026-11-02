import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { CrmMediaCopyRepo } from './crm-media-copy.repo';

describe('CrmMediaCopyQueries (migration 880)', () => {
  it('batch: the host, the batch size and the retry cap; the ids', async () => {
    const { db, argsOf } = fakeDb({ 'rpc:crm_media_copy_batch': [{ data: [{ id: 'a' }, { id: 'b' }] }] });
    expect(await new CrmMediaCopyRepo(db).batch({ host: 'files.crm.example', limit: 20, maxAttempts: 3 })).toEqual(['a', 'b']);
    expect(argsOf('rpc:crm_media_copy_batch', 'rpc')).toEqual([{ p_host: 'files.crm.example', p_limit: 20, p_max_attempts: 3 }]);
  });

  it('mark: one attempt (or a skip); the attempts so far', async () => {
    const { db, argsOf } = fakeDb({ 'rpc:crm_media_copy_mark': [{ data: 2 }] });
    expect(await new CrmMediaCopyRepo(db).mark({ id: 'a', error: 'media_expired', skip: false })).toBe(2);
    expect(argsOf('rpc:crm_media_copy_mark', 'rpc')).toEqual([{ p_message: 'a', p_error: 'media_expired', p_skip: false }]);
  });

  it('counts: the four totals, 0 for a missing or malformed one', async () => {
    const { db } = fakeDb({ 'rpc:crm_media_copy_counts': [{ data: { copied: 480, failed: 3, remaining: 7 } }, { data: null }] });
    const q = new CrmMediaCopyRepo(db);
    expect(await q.counts('h.example')).toEqual({ copied: 480, failed: 3, skipped: 0, remaining: 7 });
    expect(await q.counts('h.example')).toEqual({ copied: 0, failed: 0, skipped: 0, remaining: 0 });
  });

  it('an RPC error throws', async () => {
    const { db } = fakeDb({ 'rpc:crm_media_copy_batch': [{ error: { message: 'denied' } }] });
    await expect(new CrmMediaCopyRepo(db).batch({ host: 'h.example', limit: 1, maxAttempts: 1 })).rejects.toThrow('denied');
  });
});
