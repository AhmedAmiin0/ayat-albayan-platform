import { describe, expect, it, vi } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import type { LineHealthStore } from '@/modules/messaging/whatsapp/lines/line-health.store';
import { RulesRepo } from './rules.repo';

const queries = (all: () => Promise<unknown>) =>
  new RulesRepo({} as unknown as Db, { all: vi.fn(all) } as unknown as LineHealthStore, () => true);

describe('RulesQueries.lines: the kept numbers never fail the list', () => {
  it('a failed read (e.g. wa_line_health not migrated yet) reads as «not checked yet»', async () => {
    await expect(queries(async () => Promise.reject(new Error('relation does not exist'))).lines()).resolves.toEqual([]);
  });

  it('a good read passes through', async () => {
    const row = { line: 'notifications', display_phone_e164: '+966500000000', verified_name: null, checked_at: '2026-10-22T08:00:00Z' };
    await expect(queries(async () => [row]).lines()).resolves.toEqual([row]);
  });
});

describe('RulesQueries.reach and classroom', () => {
  const health = { all: vi.fn(async () => []) } as unknown as LineHealthStore;

  it('three head counts: guardians, active teachers with a phone, leads', async () => {
    const f = fakeDb({ guardians: [{ count: 7 }], teachers: [{ count: 2 }], leads: [{ count: 11 }] });
    await expect(new RulesRepo(f.db, health, () => true).reach()).resolves.toEqual({ guardian: 7, teacher: 2, lead: 11 });
    expect(f.argsOf('guardians', 'select')).toEqual(['id', { count: 'exact', head: true }]);
    expect(f.argsOf('teachers', 'eq')).toEqual(['status', 'active']);
    expect(f.argsOf('teachers', 'not')).toEqual(['phone_e164', 'is', null]);
  });

  it('a failed count reads 0 and never fails the list', async () => {
    const f = fakeDb({ guardians: [{ error: { message: 'boom' } }], teachers: [{ count: null }], leads: [{ count: 3 }] });
    await expect(new RulesRepo(f.db, health, () => true).reach()).resolves.toEqual({ guardian: 0, teacher: 0, lead: 3 });
  });

  it('classroom() asks the injected check each time', () => {
    let on = false;
    const q = new RulesRepo({} as unknown as Db, health, () => on);
    expect(q.classroom()).toBe(false);
    on = true;
    expect(q.classroom()).toBe(true);
  });
});
