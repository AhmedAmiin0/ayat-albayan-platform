import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../modules/people/guardians/fake-db';
import { FakeAvatarFiles } from './avatars.fakes';
import { StaffPhotos, staffPhotoPath } from './staff-photos';

// Staff photos everywhere (owner 2026-10-28): one read and ONE signing call per list; null/absent when none.

describe('staffPhotoPath', () => {
  it('prefers the login’s own photo, else the teacher record’s', () => {
    expect(staffPhotoPath({ own: 'u/avatar-1.png', teacher: 'teachers/t/avatar-2.png' })).toBe('u/avatar-1.png');
    expect(staffPhotoPath({ own: null, teacher: 'teachers/t/avatar-2.png' })).toBe('teachers/t/avatar-2.png');
    expect(staffPhotoPath({ own: undefined, teacher: null })).toBeNull();
  });
});

describe('StaffPhotos', () => {
  it('ofTeachers: one teachers read, one batch for the whole list, no entry without a photo', async () => {
    const f = fakeDb({
      teachers: [{ data: [
        { id: 't1', avatar_path: 'teachers/t1/avatar-1.png', profile: null },
        { id: 't2', avatar_path: 'teachers/t2/avatar-1.png', profile: { avatar_path: 'p2/avatar-9.png' } },
        { id: 't3', avatar_path: null, profile: null },
      ] }],
    });
    const files = new FakeAvatarFiles();
    const urls = await new StaffPhotos(f.db, files).ofTeachers(['t1', 't2', 't3', 't1']);
    expect(f.trips).toEqual(['teachers']);
    expect(f.argsOf('teachers', 'in')).toEqual(['id', ['t1', 't2', 't3']]);
    expect(files.batches).toEqual([['teachers/t1/avatar-1.png', 'p2/avatar-9.png']]);
    expect(Object.fromEntries(urls)).toEqual({
      t1: 'https://storage.test/signed/teachers/t1/avatar-1.png',
      t2: 'https://storage.test/signed/p2/avatar-9.png',
    });
  });

  it('ofProfiles: falls back to the linked teacher record’s photo; a student or guardian photo is never signed', async () => {
    const f = fakeDb({
      profiles: [{ data: [
        { id: 'p1', avatar_path: null, role: 'teacher' },
        { id: 'p2', avatar_path: 'p2/avatar-1.png', role: 'admin' },
        { id: 'p3', avatar_path: null, role: 'sales' },
        { id: 'p4', avatar_path: 'p4/avatar-1.png', role: 'student' },
        { id: 'p5', avatar_path: 'p5/avatar-1.png', role: 'guardian' },
      ] }],
      teachers: [{ data: [{ profile_id: 'p1', avatar_path: 'teachers/t1/avatar-1.png' }] }],
    });
    const files = new FakeAvatarFiles();
    const urls = await new StaffPhotos(f.db, files).ofProfiles(['p1', 'p2', 'p3', 'p4', 'p5']);
    expect(files.batches).toEqual([['teachers/t1/avatar-1.png', 'p2/avatar-1.png']]);
    expect([...urls.keys()]).toEqual(['p1', 'p2']);
  });

  it('no ids: no read and no signing call', async () => {
    const f = fakeDb({});
    const files = new FakeAvatarFiles();
    expect((await new StaffPhotos(f.db, files).ofTeachers([])).size).toBe(0);
    expect((await new StaffPhotos(f.db, files).ofProfiles([])).size).toBe(0);
    expect(f.trips).toEqual([]);
    expect(files.batches).toEqual([]);
  });
});
