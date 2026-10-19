import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { SalesAcademyQueries } from './sales-academy.queries';

const NOW = new Date('2026-10-11T16:10:00.000Z');

describe('SalesAcademyQueries (whitelisted selects)', () => {
  it('teachers: active only, by name; the fixed link is the one link column, never pay or phone', async () => {
    const f = fakeDb({ teachers: [{ data: [] }] });
    await new SalesAcademyQueries(f.db).teachers();
    const [select] = f.argsOf('teachers', 'select') ?? [];
    expect(select).toBe('id, display_name_ar, display_name_en, gender, programs, meeting_link, meeting_mode, students(id, code, name, status, program)');
    expect(String(select)).not.toMatch(/rate|phone|notes|max_students|calendar|meeting_link_override/);
    expect(f.argsOf('teachers', 'eq')).toEqual(['status', 'active']);
  });

  it('students: one page by name, searched by normalised name or code, with the total', async () => {
    const f = fakeDb({ students: [{ data: [{ id: 's1' }], count: 41 }] });
    const out = await new SalesAcademyQueries(f.db).students({ page: 3, pageSize: 20, search: 'سهيلة' });
    expect(out.total).toBe(41);
    expect(String(f.argsOf('students', 'select')?.[0])).not.toMatch(/notes|meeting|phone|balance|package/);
    expect(f.argsOf('students', 'range')).toEqual([40, 59]);
    expect(String(f.argsOf('students', 'or')?.[0])).toContain('name_normalized.ilike.*سهيله*');
  });

  it('students without a search: no or() filter', async () => {
    const f = fakeDb({ students: [{ data: [], count: 0 }] });
    await new SalesAcademyQueries(f.db).students({ page: 1, pageSize: 25 });
    expect(f.argsOf('students', 'or')).toBeUndefined();
  });

  it('live: starts_at <= now < ends_at, open statuses only', async () => {
    const f = fakeDb({ lessons: [{ data: [] }] });
    await new SalesAcademyQueries(f.db).live(NOW);
    expect(f.argsOf('lessons', 'lte')).toEqual(['starts_at', NOW.toISOString()]);
    expect(f.argsOf('lessons', 'gt')).toEqual(['ends_at', NOW.toISOString()]);
    expect(f.argsOf('lessons', 'in')).toEqual(['status', ['scheduled', 'confirmed']]);
  });

  it('a database error becomes an error', async () => {
    const f = fakeDb({ lessons: [{ error: { message: 'boom' } }] });
    await expect(new SalesAcademyQueries(f.db).live(NOW)).rejects.toThrow(/boom/);
  });
});
