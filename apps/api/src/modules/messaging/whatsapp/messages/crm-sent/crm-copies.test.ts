import { describe, expect, it, vi } from 'vitest';
import type { Db } from '@/common/db/db.module';
import type { MetaTemplate } from '@/modules/messaging/whatsapp/whatsapp.types';
import { CrmCopiesRepo } from './crm-copies.repo';
import { saveCrmCopies } from './crm-copies.save';

// crm_template_copies: written from the crm line's list, read once a minute by the inbox.

const NOW = new Date('2026-11-07T08:00:00Z');
const BODY = { type: 'BODY', text: 'أستاذ {{1}}' };
const meta = (name: string, components: unknown[]): MetaTemplate =>
  ({ id: '', name, language: 'ar', status: 'APPROVED', category: '', quality: null, components, rejectedReason: null });

function fakeDb(rows: unknown[] = []) {
  const upsert = vi.fn(async () => ({ error: null }));
  const select = vi.fn(async () => ({ data: rows, error: null }));
  const db = { from: vi.fn(() => ({ upsert, select })) } as unknown as Db;
  return { db, upsert, select };
}

describe('CrmCopiesRepo', () => {
  it('saves only templates the CRM listed with their text, by name + language', async () => {
    const f = fakeDb();
    const saved = await new CrmCopiesRepo(f.db).save([meta('teacher_lesson_reminder', [BODY]), meta('bare', [])], NOW);
    expect(saved).toBe(1);
    expect(f.upsert).toHaveBeenCalledWith(
      [{ name: 'teacher_lesson_reminder', language: 'ar', components: [BODY], synced_at: NOW.toISOString() }],
      { onConflict: 'name,language' },
    );
    expect(await new CrmCopiesRepo(f.db).save([meta('bare', [])], NOW)).toBe(0);
  });

  it('find(): one read a minute; a malformed stored value reads as no components', async () => {
    const f = fakeDb([{ name: 'a', language: 'ar', components: [BODY] }, { name: 'b', language: 'ar', components: 'x' }]);
    const repo = new CrmCopiesRepo(f.db);
    expect(await repo.find('a', 'ar', 0)).toEqual([BODY]);
    expect(await repo.find('b', 'ar', 1)).toEqual([]);
    expect(await repo.find('c', 'ar', 2)).toBeNull();
    expect(f.select).toHaveBeenCalledTimes(1);
    await repo.find('a', 'ar', 61_000);
    expect(f.select).toHaveBeenCalledTimes(2);
  });

  it('a failed read is no copy (the registry rendering), never an error', async () => {
    const db = { from: () => ({ select: async () => ({ data: null, error: { message: 'down' } }) }) } as unknown as Db;
    expect(await new CrmCopiesRepo(db).find('a', 'ar')).toBeNull();
  });

  it('a failed read is not cached: the next call reads again and finds the copy', async () => {
    const select = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'down' } })
      .mockResolvedValueOnce({ data: [{ name: 'a', language: 'ar', components: [BODY] }], error: null });
    const repo = new CrmCopiesRepo({ from: () => ({ select }) } as unknown as Db);
    expect(await repo.find('a', 'ar', 0)).toBeNull();
    expect(await repo.find('a', 'ar', 1)).toEqual([BODY]);
    expect(select).toHaveBeenCalledTimes(2);
  });
});

describe('saveCrmCopies', () => {
  it('a failed write only logs; no repo = nothing', async () => {
    const warn = vi.fn();
    const copies = { save: vi.fn(async () => Promise.reject(new Error('boom'))) };
    await saveCrmCopies({ copies, log: { warn } }, { list: [], now: NOW });
    expect(warn).toHaveBeenCalledWith('crm template copies not saved: boom');
    await expect(saveCrmCopies({ log: { warn } }, { list: [], now: NOW })).resolves.toBeUndefined();
  });
});
