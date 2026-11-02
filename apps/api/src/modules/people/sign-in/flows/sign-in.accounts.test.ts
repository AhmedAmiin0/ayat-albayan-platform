import { describe, expect, it } from 'vitest';
import { errorCode } from '@/common/http/errors';
import { Provisioner } from '@/modules/people/sign-in/accounts/provision';
import { FakeAudit } from '@/modules/people/sign-in/sign-in.fakes';
import { FakeAuth, FakeSubjects, PHONES } from '@/modules/people/sign-in/sign-in.fakes.accounts';
import { SignInAccounts } from './sign-in.accounts';
import type { PasswordTarget } from './targets';

const setup = () => {
  const subjects = new FakeSubjects();
  const auth = new FakeAuth();
  const provision = new Provisioner(subjects, auth, new FakeAudit().asPort());
  return { subjects, auth, accounts: new SignInAccounts(subjects, auth, provision) };
};

const codeOf = async (p: Promise<unknown>) => errorCode(await p.catch((e: unknown) => e));
const code = { purpose: 'reset_password' as const, subject: { kind: 'profile' as const, id: 'x' } };

describe('SignInAccounts', () => {
  it('guardianSession makes the guardian login once and returns its magic-link session', async () => {
    const { auth, accounts } = setup();
    const guardian = await accounts.guardianByPhone(PHONES.guardian);
    expect(guardian).not.toBeNull();
    const first = await accounts.guardianSession(guardian ?? fail());
    expect(first.session.type).toBe('magiclink');
    expect(auth.links).toHaveLength(1);
    const again = await accounts.guardianSession(guardian ?? fail());
    expect(again.userId).toBe(first.userId);
  });

  it('passwordSession signs in by username, never by email or phone', async () => {
    const { accounts } = setup();
    expect(await accounts.passwordSession('omar', 'Teacher-pass-1')).toMatchObject({
      access_token: 'at-p-teacher',
    });
    expect(await accounts.passwordSession('omar', 'wrong')).toBeNull();
    expect(await accounts.passwordSession('teacher@example.com', 'Teacher-pass-1')).toBeNull();
    expect(await accounts.passwordSession(PHONES.teacher, 'Teacher-pass-1')).toBeNull();
  });

  it('setPassword on an existing login sets it, signs out everywhere, returns the reset event', async () => {
    const { subjects, auth, accounts } = setup();
    const profile = subjects.profiles[0] ?? fail();
    const target: PasswordTarget = { kind: 'staff', profile, code: { ...code, phone: 'p' } };
    const event = await accounts.setPassword(target, 'New-pass-123');
    expect(event).toEqual({ userId: 'p-teacher', action: 'password_reset', via: 'staff' });
    expect(auth.revoked).toEqual(['p-teacher']);
    expect(await accounts.passwordSession('omar', 'New-pass-123')).not.toBeNull();
  });

  it("setPassword makes a student's first login (password_set)", async () => {
    const { subjects, accounts } = setup();
    const student = subjects.students[0] ?? fail();
    const target: PasswordTarget = { kind: 'student', student, code: { ...code, phone: 'p' } };
    const event = await accounts.setPassword(target, 'New-pass-123');
    expect(event).toMatchObject({ action: 'password_set', via: 'student' });
  });

  it('setPassword refuses a staff target without a login (401 invalid_code)', async () => {
    const { accounts } = setup();
    const profile = { id: '', role: 'teacher' as const, disabled: false, phone: 'p' };
    const target: PasswordTarget = { kind: 'staff', profile, code: { ...code, phone: 'p' } };
    expect(await codeOf(accounts.setPassword(target, 'New-pass-123'))).toBe('invalid_code');
  });
});

function fail(): never {
  throw new Error('fixture missing');
}
