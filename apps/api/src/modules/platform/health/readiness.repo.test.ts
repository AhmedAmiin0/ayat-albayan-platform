import { describe, expect, it, vi } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { ReadinessRepo } from './readiness.repo';

type Answer = (signal: AbortSignal) => Promise<{ error: { message: string } | null }>;

/** roles.select('id').limit(1).abortSignal(s): the answer decides, the signal can stop it. */
function fakeDb(answer: Answer) {
  const from = vi.fn(() => ({
    select: () => ({ limit: () => ({ abortSignal: (s: AbortSignal) => answer(s) }) }),
  }));
  return { db: { from } as unknown as Db, from };
}

const never: Answer = (signal) =>
  new Promise((resolve) => {
    signal.addEventListener('abort', () => resolve({ error: { message: 'AbortError' } }));
  });

describe('ReadinessRepo.ping (one tiny query, a short timeout)', () => {
  it('a fast answer passes, reading one row of roles (six system roles, always there)', async () => {
    const t = fakeDb(async () => ({ error: null }));
    await expect(new ReadinessRepo(t.db).ping(50)).resolves.toBeUndefined();
    expect(t.from).toHaveBeenCalledWith('roles');
  });

  it('a database error rejects', async () => {
    const t = fakeDb(async () => ({ error: { message: 'connection refused' } }));
    await expect(new ReadinessRepo(t.db).ping(50)).rejects.toThrow('connection refused');
  });

  it('a stalled database is cut off at the timeout', async () => {
    const t = fakeDb(never);
    const started = Date.now();
    await expect(new ReadinessRepo(t.db).ping(20)).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(1_000);
  });
});
