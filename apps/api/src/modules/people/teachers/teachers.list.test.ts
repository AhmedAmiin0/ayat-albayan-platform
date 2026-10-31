import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { fakePhotos } from '@/common/storage/avatars/avatars.fakes';
import { TeachersRepo } from './teachers.repo';

const page = { page: 1, pageSize: 25 };

async function list(q: Parameters<TeachersRepo['list']>[0]) {
  const fake = fakeDb({ teachers: [{ data: [], count: 0 }] });
  await new TeachersRepo(fake.db, fakePhotos().photos).list(q);
  const of = (method: string) => fake.calls.filter((c) => c.method === method).map((c) => c.args);
  return of;
}

describe('GET /teachers sort + column filters (R-TCH-01, R-NFR-08)', () => {
  it('default: Arabic name, then id', async () => {
    const of = await list(page);
    expect(of('order')).toEqual([['display_name_ar', { ascending: true }], ['id']]);
  });

  it('a sort key → its column, then the name and id as tiebreakers', async () => {
    const of = await list({ ...page, sort: 'max_students', dir: 'desc' });
    expect(of('order')).toEqual([
      ['max_students', { ascending: false }],
      ['display_name_ar', { ascending: true }],
      ['id'],
    ]);
  });

  it('phone sorts with teachers without one last', async () => {
    const of = await list({ ...page, sort: 'phone' });
    expect(of('order')[0]).toEqual(['phone_e164', { ascending: true, nullsFirst: false }]);
  });

  it('filters: name contains, phone digits in any format, one program, status', async () => {
    const of = await list({ ...page, name: 'سارة', phone: '٠١٠ 0123', programs: 'quran', status: 'active' });
    expect(of('ilike')).toEqual([
      ['display_name_ar', '%سارة%'],
      ['phone_e164', '%100123%'],
    ]);
    expect(of('contains')).toEqual([['programs', ['quran']]]);
    expect(of('eq')).toEqual([['status', 'active']]);
  });

  it('no filter → no filter call', async () => {
    const of = await list(page);
    expect([...of('ilike'), ...of('eq'), ...of('contains')]).toEqual([]);
  });
});
