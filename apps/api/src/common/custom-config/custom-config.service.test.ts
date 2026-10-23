import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../db/db.module';
import { CustomConfigService } from './custom-config.service';

type Result = { data: unknown; error: { message: string } | null };

/** A PostgREST-like chain: every builder call is recorded, and awaiting it answers `result`. */
function service(result: Result) {
  const calls: [string, unknown[]][] = [];
  const chain: Record<string, unknown> = {
    then: (resolve: (r: Result) => unknown) => resolve(result),
  };
  for (const m of ['select', 'order', 'eq', 'maybeSingle', 'upsert', 'single', 'delete']) {
    chain[m] = vi.fn((...args: unknown[]) => {
      calls.push([m, args]);
      return chain;
    });
  }
  const from = vi.fn(() => chain);
  return { svc: new CustomConfigService({ from } as unknown as Db), from, calls };
}

const ROW = { key: 'promo', value: { text: 'hi' }, description: null, is_public: true, updated_at: '2026-10-05T00:00:00Z', updated_by: 'u1' };
const VIEW = { key: 'promo', value: { text: 'hi' }, description: null, isPublic: true, updatedAt: '2026-10-05T00:00:00Z', updatedBy: 'u1' };
const BOOM = { data: null, error: { message: 'boom' } };

describe('CustomConfigService (custom_config)', () => {
  it('list maps the rows to views, ordered by key', async () => {
    const { svc, from, calls } = service({ data: [ROW], error: null });
    expect(await svc.list()).toEqual([VIEW]);
    expect(from).toHaveBeenCalledWith('custom_config');
    expect(calls).toContainEqual(['order', ['key']]);
  });

  it('find answers the view of one key, or null when there is none', async () => {
    const hit = service({ data: ROW, error: null });
    expect(await hit.svc.find('promo')).toEqual(VIEW);
    expect(hit.calls).toContainEqual(['eq', ['key', 'promo']]);
    expect(await service({ data: null, error: null }).svc.find('promo')).toBeNull();
  });

  it('publicRows asks the database for the is_public rows only', async () => {
    const rows = [{ key: 'promo', value: 'hi', is_public: true }];
    const { svc, calls } = service({ data: rows, error: null });
    expect(await svc.publicRows()).toEqual(rows);
    expect(calls).toContainEqual(['select', ['key, value, is_public']]);
    expect(calls).toContainEqual(['eq', ['is_public', true]]);
  });

  it('upsert writes the row stamped with the admin (no description = null) and returns its view', async () => {
    const { svc, calls } = service({ data: ROW, error: null });
    expect(await svc.upsert('promo', { value: { text: 'hi' }, isPublic: true }, 'u1')).toEqual(VIEW);
    expect(calls).toContainEqual(['upsert', [{ key: 'promo', value: { text: 'hi' }, description: null, is_public: true, updated_by: 'u1' }]]);
  });

  it('remove returns true when a row was deleted, false when nothing was', async () => {
    const one = service({ data: [{ key: 'promo' }], error: null });
    expect(await one.svc.remove('promo')).toBe(true);
    expect(one.calls).toContainEqual(['eq', ['key', 'promo']]);
    expect(await service({ data: [], error: null }).svc.remove('promo')).toBe(false);
  });

  it('a DB error throws instead of answering empty', async () => {
    await expect(service(BOOM).svc.list()).rejects.toThrow('custom_config read failed: boom');
    await expect(service(BOOM).svc.find('promo')).rejects.toThrow('custom_config read failed: boom');
    await expect(service(BOOM).svc.publicRows()).rejects.toThrow('custom_config read failed: boom');
    await expect(service(BOOM).svc.upsert('promo', { value: 1, isPublic: false }, 'u1')).rejects.toThrow('custom_config write failed: boom');
    await expect(service(BOOM).svc.remove('promo')).rejects.toThrow('custom_config delete failed: boom');
  });
});
