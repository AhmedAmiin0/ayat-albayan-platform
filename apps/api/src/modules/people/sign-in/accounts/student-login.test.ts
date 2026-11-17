import { describe, expect, it } from 'vitest';
import { errorCode } from '@/common/http/errors';
import { FakeAudit } from '@/modules/people/sign-in/sign-in.fakes';
import { FakeAuth, FakeSubjects, PHONES } from '@/modules/people/sign-in/sign-in.fakes.accounts';
import type { StudentRec } from '@/modules/people/sign-in/sign-in.ports';
import { StudentLogins } from './student-login';

const setup = () => {
  const subjects = new FakeSubjects();
  const auth = new FakeAuth();
  const audit = new FakeAudit();
  const child = subjects.students[0];
  if (!child) throw new Error('fixture missing');
  const logins = new StudentLogins(subjects, auth, audit.asPort());
  return { subjects, auth, audit, child, logins };
};

/** s1's own number (FakeSubjects.numbers) as family sign-in finds it. */
const own = (rec: StudentRec) => ({ kind: 'student' as const, phone: PHONES.student, rec });

const codeOf = async (p: Promise<unknown>) => errorCode(await p.catch((e: unknown) => e));

describe('StudentLogins.forCode (a student signs in with a WhatsApp code)', () => {
  it('makes the student login once, without a password, and links it', async () => {
    const { subjects, auth, audit, child, logins } = setup();
    const id = await logins.forCode(own(child));
    expect(auth.users.find((u) => u.id === id)).toEqual({
      id,
      email: 's-s1@family.invalid',
      password: null,
    });
    const profile = subjects.profiles.find((p) => p.id === id);
    expect(profile).toMatchObject({ role: 'student', phone: null });
    expect(child.profileId).toBe(id);
    expect(audit.entries.map((e) => e.action)).toEqual(['profile_provisioned']);
    expect(await logins.forCode(own(child))).toBe(id);
    expect(auth.users).toHaveLength(3);
  });

  it('reuses an enabled student login', async () => {
    const { subjects, auth, child, logins } = setup();
    subjects.profiles.push({ id: 'p-s1', role: 'student', disabled: false, phone: null });
    expect(await logins.forCode(own({ ...child, profileId: 'p-s1' }))).toBe('p-s1');
    expect(auth.users).toHaveLength(2);
  });

  it.each([
    ['disabled', { role: 'student', disabled: true }],
    ['of another role', { role: 'guardian', disabled: false }],
  ] as const)('refuses a login that is %s (403 account_disabled)', async (_name, login) => {
    const { subjects, child, logins } = setup();
    subjects.profiles.push({ id: 'p-s1', phone: null, ...login });
    const code = await codeOf(logins.forCode(own({ ...child, profileId: 'p-s1' })));
    expect(code).toBe('account_disabled');
  });

  it('a lost race to an unusable login answers 403 and removes only what it made', async () => {
    const { auth, child, logins } = setup();
    child.profileId = 'p-other';
    const stale: StudentRec = { ...child, profileId: null };
    expect(await codeOf(logins.forCode(own(stale)))).toBe('account_disabled');
    expect(auth.users.map((u) => u.id)).toEqual(['p-teacher', 'p-admin']);
  });

  it("a lost race to the child's first password: the winner's login opens", async () => {
    const { subjects, auth, child, logins } = setup();
    subjects.profiles.push({ id: 'p-win', role: 'student', disabled: false, phone: null });
    child.profileId = 'p-win';
    const stale: StudentRec = { ...child, profileId: null };
    expect(await logins.forCode(own(stale))).toBe('p-win');
    expect(auth.users.map((u) => u.id)).toEqual(['p-teacher', 'p-admin']);
  });

  it('a lost race after the number moved to another student: 403, never that one', async () => {
    const { subjects, child, logins } = setup();
    subjects.profiles.push({ id: 'p-win', role: 'student', disabled: false, phone: null });
    child.profileId = 'p-win';
    const stale: StudentRec = { ...child, id: 's-gone', profileId: null };
    subjects.students.push({ ...stale, code: 'AB-9999', profileId: 'p-gone' });
    expect(await codeOf(logins.forCode(own(stale)))).toBe('account_disabled');
  });
});
