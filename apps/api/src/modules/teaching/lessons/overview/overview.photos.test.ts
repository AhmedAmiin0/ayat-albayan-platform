import { describe, expect, it } from 'vitest';
import { fakePhotos } from '@/common/storage/avatars/avatars.fakes';
import { readerOf } from '@/common/settings/settings.fakes';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import { OverviewRepo } from './overview.repo';

// GET /lessons/overview: every teacher's photo, even without a lesson in the window, in ONE call.

describe('overview teacher photos', () => {
  it('asks once for the listed teachers, null when none', async () => {
    const f = fakeDb({ teachers: [{ data: [{ id: 't1' }, { id: 't2' }] }] });
    const { photos, calls } = fakePhotos({ t1: 'https://storage.test/t1' });
    const rows = await new OverviewRepo(f.db, readerOf(LessonsSettings, {}), photos).teachers({ from: new Date(0), to: new Date(1) });
    expect(calls).toEqual([{ method: 'ofTeachers', ids: ['t1', 't2'] }]);
    expect(rows.map((r) => r.avatar_url)).toEqual(['https://storage.test/t1', null]);
  });
});
