import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../common/db/db.module';
import type { LineHealthStore } from '../whatsapp/line-health.store';
import { RulesQueries } from './rules.queries';

const queries = (all: () => Promise<unknown>) =>
  new RulesQueries({} as unknown as Db, { all: vi.fn(all) } as unknown as LineHealthStore);

describe('RulesQueries.lines: the kept numbers never fail the list', () => {
  it('a failed read (e.g. wa_line_health not migrated yet) reads as «not checked yet»', async () => {
    await expect(queries(async () => Promise.reject(new Error('relation does not exist'))).lines()).resolves.toEqual([]);
  });

  it('a good read passes through', async () => {
    const row = { line: 'notifications', display_phone_e164: '+966551234567', verified_name: null, checked_at: '2026-10-22T08:00:00Z' };
    await expect(queries(async () => [row]).lines()).resolves.toEqual([row]);
  });
});
