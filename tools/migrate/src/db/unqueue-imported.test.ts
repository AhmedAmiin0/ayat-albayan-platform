import { describe, expect, it } from 'vitest';
import { unqueueImportedLessons, unqueueImportedSql } from './unqueue-imported.ts';

describe('unqueueImportedLessons', () => {
  it('drops only never-synced queue rows of imported lessons', () => {
    const { text } = unqueueImportedSql();
    expect(text).toContain('delete from public.google_sync_items');
    expect(text).toContain('google_id is null');
    expect(text).toContain("target_table = 'lessons'");
  });

  it('reports the count, and a failure without throwing', async () => {
    expect(await unqueueImportedLessons({ select: async <T extends object>() => [{ n: 6 }] as T[] })).toBe('6');
    const failing = { select: async () => Promise.reject(new Error('no table')) };
    expect(await unqueueImportedLessons(failing)).toBe('failed (no table)');
  });
});
