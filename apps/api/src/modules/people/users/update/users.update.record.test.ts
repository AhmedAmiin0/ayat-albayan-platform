import { describe, expect, it, vi } from 'vitest';
import { errorCode } from '@/common/http/errors';
import { ADMIN_ACTOR, row, setupUsers, type Link } from '@/modules/people/users/users.fakes';

const codeOf = async (p: Promise<unknown>) => errorCode(await p.catch((e: unknown) => e));
const staff = () => [
  row('admin1', 'admin'),
  row('admin2', 'admin'),
  row('sales1', 'sales', { phone_e164: '+966501234567' }),
  row('t1', 'teacher'),
];
const free = (kind: Link['kind'], id: string): Link => ({
  kind,
  id,
  name: `سجل ${id}`,
  code: null,
  profile_id: null,
});
const records = (): Link[] => [
  free('teacher', 'tt1'),
  free('student', 'ss1'),
  free('guardian', 'gg1'),
  { ...free('teacher', 'tt9'), profile_id: 't1' },
];
const newTeacher = { display_name_ar: 'أحمد علي', gender: 'male' as const };
const roleOf = (rows: { id: string; role: string }[], id: string) =>
  rows.find((r) => r.id === id)?.role;

describe('PATCH /users/:id: a new teacher, student or guardian role with its record', () => {
  it('links an existing teacher record and sets the teacher role in one update', async () => {
    const { updater, store, audit } = setupUsers(staff(), records());
    const out = await updater.update('sales1', { role: 'teacher', linked_id: 'tt1' }, ADMIN_ACTOR);
    expect(out.role).toBe('teacher');
    expect(out.linked).toMatchObject({ kind: 'teacher', id: 'tt1' });
    const after = store.rows.find((r) => r.id === 'sales1');
    expect(after).toMatchObject({ role: 'teacher', role_id: null });
    const entry = expect.objectContaining({ linked: expect.objectContaining({ id: 'tt1' }) });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ after: entry }));
  });

  it('creates the teacher row for new_teacher with the profile phone', async () => {
    const { updater, store } = setupUsers(staff(), records());
    await updater.update('sales1', { role: 'teacher', new_teacher: newTeacher }, ADMIN_ACTOR);
    expect(store.teachers).toEqual([
      expect.objectContaining({ profile_id: 'sales1', ...newTeacher, phone_e164: '+966501234567' }),
    ]);
    expect(roleOf(store.rows, 'sales1')).toBe('teacher');
  });

  it('links an existing student or guardian record', async () => {
    const { updater, store } = setupUsers(staff(), records());
    await updater.update('sales1', { role: 'student', linked_id: 'ss1' }, ADMIN_ACTOR);
    await updater.update('admin2', { role: 'guardian', linked_id: 'gg1' }, ADMIN_ACTOR);
    expect(store.links.map((l) => [l.id, l.profile_id])).toContainEqual(['ss1', 'sales1']);
    expect(store.links.map((l) => [l.id, l.profile_id])).toContainEqual(['gg1', 'admin2']);
    const roles = [roleOf(store.rows, 'sales1'), roleOf(store.rows, 'admin2')];
    expect(roles).toEqual(['student', 'guardian']);
  });

  it('copies the teacher record phone onto a phoneless login', async () => {
    const { updater, store } = setupUsers(staff(), records());
    await updater.update('admin2', { role: 'teacher', linked_id: 'tt1' }, ADMIN_ACTOR);
    expect(store.adopted).toEqual([{ teacherId: 'tt1', profileId: 'admin2' }]);
  });
});

describe('PATCH /users/:id: refused record changes leave everything as it was', () => {
  const untouched = (s: ReturnType<typeof setupUsers>) => {
    expect(roleOf(s.store.rows, 'sales1')).toBe('sales');
    expect(s.store.teachers).toEqual([]);
    expect(s.store.links.filter((l) => l.profile_id === 'sales1')).toEqual([]);
    expect(s.audit.record).not.toHaveBeenCalled();
  };

  it('400 link_target_not_found for an unknown record', async () => {
    const s = setupUsers(staff(), records());
    const ask = { role: 'student' as const, linked_id: 'nope' };
    const code = await codeOf(s.updater.update('sales1', ask, ADMIN_ACTOR));
    expect(code).toBe('link_target_not_found');
    untouched(s);
  });

  it('409 link_taken for a record that already has a login, before any write', async () => {
    const s = setupUsers(staff(), records());
    const clear = vi.spyOn(s.cache, 'clear');
    const ask = { role: 'teacher' as const, linked_id: 'tt9' };
    expect(await codeOf(s.updater.update('sales1', ask, ADMIN_ACTOR))).toBe('link_taken');
    untouched(s);
    expect(clear).not.toHaveBeenCalled();
  });

  it('a taken phone stops the change before the record is linked', async () => {
    const s = setupUsers(staff(), records());
    s.store.otherTeacherPhones = ['+966509999999'];
    const ask = { role: 'teacher' as const, linked_id: 'tt1', phone_e164: '+966509999999' };
    expect(await codeOf(s.updater.update('sales1', ask, ADMIN_ACTOR))).toBe('phone_taken');
    untouched(s);
  });

  it('409 role_change_linked for a linked login and for a change away from teacher', async () => {
    const linked = { ...free('guardian', 'gg2'), profile_id: 'sales1' };
    const s = setupUsers(staff(), [...records(), linked]);
    const ask = { role: 'teacher' as const, linked_id: 'tt1' };
    expect(await codeOf(s.updater.update('sales1', ask, ADMIN_ACTOR))).toBe('role_change_linked');
    const away = { role: 'student' as const, linked_id: 'ss1' };
    expect(await codeOf(s.updater.update('t1', away, ADMIN_ACTOR))).toBe('role_change_linked');
    expect(roleOf(s.store.rows, 't1')).toBe('teacher');
    expect(s.store.links.find((l) => l.id === 'tt1')?.profile_id).toBeNull();
  });

  it('400 link_not_allowed when the role does not change into a record-backed one', async () => {
    const s = setupUsers([...staff(), row('t2', 'teacher')], records());
    const ask = { role: 'teacher' as const, linked_id: 'tt1' };
    expect(await codeOf(s.updater.update('t2', ask, ADMIN_ACTOR))).toBe('link_not_allowed');
    expect(s.store.links.find((l) => l.id === 'tt1')?.profile_id).toBeNull();
  });
});
