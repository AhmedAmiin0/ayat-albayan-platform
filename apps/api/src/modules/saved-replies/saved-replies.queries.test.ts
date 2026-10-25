import { describe, expect, it } from 'vitest';
import type { Db } from '../../common/db/db.module';
import { SavedRepliesQueries } from './saved-replies.queries';

// A one-call stand-in for supabase-js: every chain ends in the given result.
function dbReturning(result: { data: unknown; error: { code: string; message: string } | null }): Db {
  const chain: Record<string, unknown> = {};
  for (const name of ['from', 'insert', 'update', 'eq', 'select']) chain[name] = () => chain;
  chain.single = async () => result;
  chain.maybeSingle = async () => result;
  return chain as unknown as Db;
}

const failure = async (run: () => Promise<unknown>) => {
  try {
    await run();
    return 'ok';
  } catch (e) {
    const err = e as { getStatus?: () => number; getResponse?: () => { code?: string } };
    return err.getStatus ? [err.getStatus(), err.getResponse?.().code] : 'plain error';
  }
};

describe('SavedRepliesQueries writes', () => {
  const duplicate = { data: null, error: { code: '23505', message: 'duplicate key' } };

  it('a second reply on the same attachment path is 400 file_path (create and update)', async () => {
    const queries = new SavedRepliesQueries(dbReturning(duplicate));
    expect(await failure(() => queries.insert({ title: 't', body: 'b' }))).toEqual([400, 'file_path']);
    expect(await failure(() => queries.update('id', { title: 't' }))).toEqual([400, 'file_path']);
  });

  it('any other database error stays a plain error', async () => {
    const queries = new SavedRepliesQueries(dbReturning({ data: null, error: { code: '57014', message: 'timeout' } }));
    expect(await failure(() => queries.insert({ title: 't', body: 'b' }))).toBe('plain error');
  });
});
