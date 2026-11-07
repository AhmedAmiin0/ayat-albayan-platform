import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { TemplatesRepo } from './templates.repo';

// docs/42 42-3: the sender pass's templates come from a 60 s copy, dropped by every write here.

const T = 'message_templates';

describe('TemplatesRepo.sendable (docs/42 42-3)', () => {
  it('one read within the minute, a fresh read after it', async () => {
    const row = templateRow();
    const { db, trips } = fakeDb({ [T]: [{ data: [row] }, { data: [] }] });
    const repo = new TemplatesRepo(db);
    await expect(repo.sendable(0)).resolves.toEqual([row]);
    await expect(repo.sendable(59_999)).resolves.toEqual([row]);
    expect(trips).toEqual([T]);
    await expect(repo.sendable(60_000)).resolves.toEqual([]);
    expect(trips).toEqual([T, T]);
  });

  it('a template write drops the copy at once (a paused template stops being sendable)', async () => {
    const row = templateRow();
    const paused = { ...row, status: 'paused' };
    const { db } = fakeDb({ [T]: [{ data: [row] }, { data: paused }, { data: [] }] });
    const repo = new TemplatesRepo(db);
    await repo.sendable(0);
    await repo.update(row.key, { status: 'paused' });
    await expect(repo.sendable(1)).resolves.toEqual([]);
  });
});
