import { describe, expect, it } from 'vitest';
import { FakeAudit } from '@/modules/people/sign-in/sign-in.fakes';
import { FakeAuth, FakeSubjects } from '@/modules/people/sign-in/sign-in.fakes.accounts';
import { familyEmail, Provisioner } from './provision';

const ADDRESS = familyEmail('t', 't-new');

const setup = () => {
  const subjects = new FakeSubjects();
  const auth = new FakeAuth();
  return { subjects, auth, provision: new Provisioner(subjects, auth, new FakeAudit().asPort()) };
};

const newTeacher = (s: FakeSubjects) => {
  const t = s.teachers.find((x) => x.id === 't-new');
  if (!t) throw new Error('fixture');
  return { ...t, login: null };
};

describe('LoginMaker adopts only a login nobody else owns (review item 2)', () => {
  it('a teacher login of another record that took the address: refused, untouched', async () => {
    const { subjects, auth, provision } = setup();
    auth.users.push({ id: 'u-taken', email: ADDRESS, password: 'Owner-pass-1' });
    subjects.profiles.push({ id: 'u-taken', role: 'teacher', disabled: false, phone: null });
    subjects.teachers.push({
      id: 't-other',
      name: 'أخرى',
      tz: 'Asia/Riyadh',
      recordPhone: null,
      profileId: 'u-taken',
      active: true,
    });
    await expect(provision.teacher(newTeacher(subjects))).rejects.toThrow('a record');
    expect(auth.users.find((u) => u.id === 'u-taken')?.password).toBe('Owner-pass-1');
    expect(auth.revoked).toEqual([]);
    expect(newTeacher(subjects).profileId).toBeNull();
  });

  it('a left login with no profile: adopted with a fresh random password, sessions revoked', async () => {
    const { subjects, auth, provision } = setup();
    auth.users.push({ id: 'u-left', email: ADDRESS, password: 'Old-pass-1' });
    await expect(provision.teacher(newTeacher(subjects))).resolves.toBe('u-left');
    const password = auth.users.find((u) => u.id === 'u-left')?.password ?? '';
    expect(password).not.toBe('Old-pass-1');
    expect(password.length).toBeGreaterThanOrEqual(24);
    expect(auth.revoked).toEqual(['u-left']);
  });

  it('a left teacher profile no record links to: adopted', async () => {
    const { subjects, auth, provision } = setup();
    auth.users.push({ id: 'u-half', email: ADDRESS, password: null });
    subjects.profiles.push({ id: 'u-half', role: 'teacher', disabled: false, phone: null });
    await expect(provision.teacher(newTeacher(subjects))).resolves.toBe('u-half');
  });
});
