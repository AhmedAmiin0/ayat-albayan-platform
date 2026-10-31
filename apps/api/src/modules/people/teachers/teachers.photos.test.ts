import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { fakePhotos } from '@/common/storage/avatars/avatars.fakes';
import { TeachersRepo } from './teachers.repo';

// GET /teachers (owner 2026-10-28): each row's photo from ONE StaffPhotos call for the page; the stored path never leaves.

describe('teacher list photos', () => {
  it('asks once for the page’s teachers and sets avatar_url, null when none', async () => {
    const f = fakeDb({
      teachers: [{ data: [{ id: 't1', display_name_ar: 'أبرار', avatar_path: 'teachers/t1/avatar-1.png' }, { id: 't2', display_name_ar: 'بدر', avatar_path: null }], count: 2 }],
      students: [{ data: [] }],
    });
    const { photos, calls } = fakePhotos({ t1: 'https://storage.test/t1' });
    const out = await new TeachersRepo(f.db, photos).list({ page: 1, pageSize: 25 });
    expect(calls).toEqual([{ method: 'ofTeachers', ids: ['t1', 't2'] }]);
    expect(out.items.map((r) => [r.id, r.avatar_url])).toEqual([['t1', 'https://storage.test/t1'], ['t2', null]]);
    expect(out.items.every((r) => !('avatar_path' in r))).toBe(true);
  });

  it('photo(id) signs one teacher', async () => {
    const { photos, calls } = fakePhotos({ t1: 'https://storage.test/t1' });
    const q = new TeachersRepo(fakeDb({}).db, photos);
    expect(await q.photo('t1')).toBe('https://storage.test/t1');
    expect(await q.photo('t9')).toBeNull();
    expect(calls.map((c) => c.ids)).toEqual([['t1'], ['t9']]);
  });
});
