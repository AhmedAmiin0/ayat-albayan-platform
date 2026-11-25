import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { SELECT } from '@/modules/finance/subscriptions/list/subscriptions.list-query';
import { StartDateEditRepo } from '@/modules/finance/subscriptions/start-date-edit/start-date-edit.repo';

const write = { id: 'sub1', from: '2026-11-01', to: '2026-11-08' };

describe('StartDateEditRepo.setStartsOn: a compare-and-set on starts_on', () => {
  it('updates starts_on only, while the read day is stored and the package is not cancelled', async () => {
    const sub = { id: 'sub1', starts_on: '2026-11-08', student: null };
    const { db, calls, trips } = fakeDb({ subscriptions: [{ data: sub }] });
    const out = await new StartDateEditRepo(db).setStartsOn(write);
    expect(trips).toEqual(['subscriptions']);
    expect(calls.map((c) => [c.method, ...c.args])).toEqual([
      ['update', { starts_on: '2026-11-08' }],
      ['eq', 'id', 'sub1'],
      ['eq', 'starts_on', '2026-11-01'],
      ['neq', 'status', 'cancelled'],
      ['select', SELECT],
      ['maybeSingle'],
    ]);
    expect(SELECT).toBe('*, student:students(id, code, name)');
    expect(out).toBe(sub);
  });

  it('no row matched (the day moved or the package was cancelled): null', async () => {
    const { db } = fakeDb({ subscriptions: [{ data: null }] });
    expect(await new StartDateEditRepo(db).setStartsOn(write)).toBeNull();
  });

  it('a database error is thrown through pgError (a unique violation is a 409)', async () => {
    const plain = fakeDb({ subscriptions: [{ error: { code: 'XX000', message: 'boom' } }] });
    await expect(new StartDateEditRepo(plain.db).setStartsOn(write)).rejects.toThrow(
      'db error XX000: boom',
    );
    const dup = fakeDb({ subscriptions: [{ error: { code: '23505', message: 'dup' } }] });
    await expect(new StartDateEditRepo(dup.db).setStartsOn(write)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
