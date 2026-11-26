import { describe, expect, it, vi } from 'vitest';
import { errorCode } from '@/common/http/errors';
import { ADMIN_ACTOR, row, setupUsers, type Link } from '@/modules/people/users/users.fakes';

const PHONE = '+966501234567';
const codeOf = async (p: Promise<unknown>) => errorCode(await p.catch((e: unknown) => e));
const sales = () => row('sales1', 'sales', { phone_e164: PHONE, tz: 'Asia/Riyadh' });
const staff = () => [row('admin1', 'admin'), row('admin2', 'admin'), sales()];
const free = (kind: Link['kind'], id: string): Link => ({
  kind,
  id,
  name: `سجل ${id}`,
  code: null,
  profile_id: null,
});
const newTeacher = { display_name_ar: 'أحمد علي', gender: 'male' as const };

function setup() {
  const s = setupUsers(staff(), [free('teacher', 'tt1'), free('student', 'ss1')]);
  const linksBefore = structuredClone(s.store.links);
  const clear = vi.spyOn(s.cache, 'clear');
  const unchanged = () => {
    expect(s.store.rows.find((r) => r.id === 'sales1')).toEqual(sales());
    expect(s.store.links).toEqual(linksBefore);
    expect(s.store.teachers).toEqual([]);
    expect(s.audit.record).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  };
  return { ...s, unchanged };
}

describe('PATCH /users/:id: a refused record leaves the profile as it was', () => {
  it('409 phone_taken before any write when a teacher row holds the phone a new teacher takes', async () => {
    const s = setup();
    s.store.otherTeacherPhones = [PHONE];
    const update = vi.spyOn(s.store, 'updateProfile');
    const ask = { role: 'teacher' as const, new_teacher: newTeacher };
    expect(await codeOf(s.updater.update('sales1', ask, ADMIN_ACTOR))).toBe('phone_taken');
    expect(update).not.toHaveBeenCalled();
    s.unchanged();
  });

  it('checks the phone the request sends for the new teacher, not the old one', async () => {
    const s = setup();
    s.store.otherTeacherPhones = ['+966509999999'];
    const ask = { role: 'teacher' as const, new_teacher: newTeacher, phone_e164: '+966509999999' };
    expect(await codeOf(s.updater.update('sales1', ask, ADMIN_ACTOR))).toBe('phone_taken');
    s.unchanged();
  });

  it('409 link_taken when another request links the record first: role, name and zone restored', async () => {
    const s = setup();
    s.store.failLink = true;
    const ask = {
      role: 'student' as const,
      linked_id: 'ss1',
      full_name: 'اسم',
      tz: 'Africa/Cairo',
    };
    expect(await codeOf(s.updater.update('sales1', ask, ADMIN_ACTOR))).toBe('link_taken');
    s.unchanged();
  });

  it('a teacher row that fails after the role write restores the role and rethrows', async () => {
    const s = setup();
    vi.spyOn(s.store, 'createTeacher').mockRejectedValueOnce(new Error('insert failed'));
    const ask = { role: 'teacher' as const, new_teacher: newTeacher };
    await expect(s.updater.update('sales1', ask, ADMIN_ACTOR)).rejects.toThrow('insert failed');
    s.unchanged();
  });
});
