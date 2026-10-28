import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../audit/audit.service';
import { fakeDb, type FakeResult } from '../../../modules/people/guardians/fake-db';
import { PNG } from '../../../modules/people/me/account/account.fakes';
import { AvatarWriter } from './avatar-writer';
import { FakeAvatarFiles } from './avatars.fakes';
import { StaffPhotoAdmin } from './staff-photo-admin';

// An admin's staff photos (owner 2026-10-28): a teacher without a login → its record; with one → the login's.

const T = 't0000000-0000-4000-8000-000000000001';
const codeOf = (p: Promise<unknown>) => p.then(() => 'ok', (e: { response?: { code?: string } }) => e.response?.code);

function kit(results: Record<string, FakeResult[]>) {
  const f = fakeDb(results);
  const files = new FakeAvatarFiles();
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const admin = new StaffPhotoAdmin(f.db, new AvatarWriter(files), audit as unknown as AuditService);
  return { f, files, audit, admin };
}

describe('StaffPhotoAdmin', () => {
  it('a teacher without a login: signs into avatars/teachers/<id>/', async () => {
    const { admin } = kit({ teachers: [{ data: { profile_id: null } }] });
    const signed = await admin.uploadUrl({ kind: 'teacher', id: T }, { mime: 'image/png', size: 900 });
    expect(signed.path).toMatch(new RegExp(`^teachers/${T}/avatar-\\d+\\.png$`));
  });

  it('registers the photo on the teacher record, audits it and signs its URL', async () => {
    const path = `teachers/${T}/avatar-1.png`;
    const { f, files, audit, admin } = kit({ teachers: [{ data: { profile_id: null } }, { data: { avatar_path: null } }, {}] });
    files.objects.set(path, { size: 900, contentType: 'image/png', bytes: PNG });
    const view = await admin.set({ kind: 'teacher', id: T }, { path, actorId: 'admin1' });
    expect(view.avatar_url).toBe(`https://storage.test/signed/${path}`);
    expect(f.calls.find((c) => c.table === 'teachers' && c.method === 'update')?.args).toEqual([{ avatar_path: path }]);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'teachers', entityId: T, action: 'avatar_set', after: { avatar_path: path } }));
  });

  it('refuses a path of another folder (nothing written)', async () => {
    const { f, admin } = kit({ teachers: [{ data: { profile_id: null } }] });
    expect(await codeOf(admin.set({ kind: 'teacher', id: T }, { path: 'teachers/other/avatar-1.png', actorId: 'a' }))).toBe('avatar_path');
    expect(f.calls.some((c) => c.method === 'update')).toBe(false);
  });

  it('a teacher with a login: its login’s folder; remove clears both slots', async () => {
    const { admin, files } = kit({
      teachers: [{ data: { profile_id: 'p1' } }, { data: { profile_id: 'p1' } }, { data: { avatar_path: `teachers/${T}/avatar-1.png` } }, {}],
      profiles: [{ data: { avatar_path: 'p1/avatar-1.png' } }, {}],
    });
    expect((await admin.uploadUrl({ kind: 'teacher', id: T }, { mime: 'image/webp', size: 9 })).path).toMatch(/^p1\/avatar-\d+\.webp$/);
    expect(await admin.remove({ kind: 'teacher', id: T }, 'admin1')).toEqual({ avatar_url: null });
    expect(files.removed).toEqual(['p1/avatar-1.png', `teachers/${T}/avatar-1.png`]);
  });

  it('a student or guardian login has no photo (400), an unknown id 404', async () => {
    const { admin } = kit({ profiles: [{ data: { role: 'student' } }, { data: null }], teachers: [{ data: null }] });
    expect(await codeOf(admin.uploadUrl({ kind: 'user', id: 's1' }, { mime: 'image/png', size: 9 }))).toBe('avatar_not_staff');
    expect(await codeOf(admin.remove({ kind: 'user', id: 'x' }, 'a'))).toBe('user_not_found');
    expect(await codeOf(admin.remove({ kind: 'teacher', id: T }, 'a'))).toBe('teacher_not_found');
  });
});
