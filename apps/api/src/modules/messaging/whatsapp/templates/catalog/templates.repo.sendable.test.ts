import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';
import { TemplatesRepo } from './templates.repo';

// docs/42 42-3: the sender pass's templates come from a 60 s copy, dropped by every write here.

const crm = vi.hoisted(() => ({ on: false }));
vi.mock('@/modules/messaging/whatsapp/templates/catalog/template-env', async (actual) => ({
  ...(await actual<object>()),
  onCrm: () => crm.on,
}));

const T = 'message_templates';

afterEach(() => {
  crm.on = false;
  vi.unstubAllEnvs();
});

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

  it('the crm gate is read per call: a driver switch drops a gated key, no new read', async () => {
    const line = 'notifications' as const;
    const row = (key: string, status: TemplateRow['status']) =>
      templateRow({ key, meta_name: key, status, line });
    const gated = row('teacher_new_student', 'not_submitted');
    const v2 = row('teacher_lesson_v2', 'approved');
    const { db, trips } = fakeDb({ [T]: [{ data: [gated, v2] }] });
    const repo = new TemplatesRepo(db);
    crm.on = true;
    const keys = async (now: number) => (await repo.sendable(now)).map((r) => r.key);
    expect(await keys(0)).toEqual(['teacher_new_student', 'teacher_lesson_v2']);
    crm.on = false; // «التكاملات»: the line moved off the crm driver
    expect(await keys(1)).toEqual(['teacher_lesson_v2']);
    expect(trips).toEqual([T]);
  });

  it('SETTINGS_CACHE_MS=0 (e2e approves by SQL): no copy, every call reads', async () => {
    vi.stubEnv('SETTINGS_CACHE_MS', '0');
    const row = templateRow();
    const { db, trips } = fakeDb({ [T]: [{ data: [] }, { data: [row] }] });
    const repo = new TemplatesRepo(db);
    await expect(repo.sendable(0)).resolves.toEqual([]);
    await expect(repo.sendable(1)).resolves.toEqual([row]);
    expect(trips).toEqual([T, T]);
  });
});
