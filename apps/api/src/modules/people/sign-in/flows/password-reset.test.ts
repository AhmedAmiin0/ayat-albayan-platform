import { describe, expect, it } from 'vitest';
import { PHONES } from '../sign-in.fakes.accounts';
import { signInWorld } from '../sign-in.world';

const IP = '203.0.113.4';
type World = ReturnType<typeof signInWorld>;

async function forgot(w: World, identifier: string): Promise<void> {
  await w.passwords.forgot({ identifier }, IP);
  await w.kit.idle();
}

describe('forgot password: a code to the phone ON FILE (docs/30 §3)', () => {
  it.each([
    ['teacher username', 'omar', PHONES.teacher],
    ['teacher email', 'Teacher@Example.com', PHONES.teacher],
    ['teacher phone typed in another format', '00966 50 000 0002', PHONES.teacher],
    ['admin email', 'admin@example.com', PHONES.admin],
    ['student code (the guardian\'s phone)', 'ab-1234', PHONES.guardian],
  ])('%s', async (_name, identifier, phone) => {
    const w = signInWorld();
    await forgot(w, identifier);
    expect(w.send.sent.map((s) => s.phone)).toEqual([phone]);
  });

  it('sends nothing, with the same answer, for a missing account, a guardian phone, a number not on file or a disabled login', async () => {
    const w = signInWorld();
    const teacher = w.subjects.profiles.find((p) => p.id === 'p-teacher');
    if (teacher) teacher.disabled = true;
    for (const identifier of ['ghost', 'nobody@example.com', PHONES.guardian, PHONES.other, 'AB-9999', 'omar']) {
      await expect(w.passwords.forgot({ identifier }, IP)).resolves.toBeUndefined();
    }
    await w.kit.idle();
    expect(w.send.sent).toEqual([]);
  });
});

describe('reset password', () => {
  it('a teacher sets a new password with the code; sessions elsewhere end', async () => {
    const w = signInWorld();
    await forgot(w, 'omar');
    await w.passwords.reset({ identifier: 'omar', code: w.send.lastTo(PHONES.teacher), password: 'Brand-new-1' }, IP, 8);
    await expect(w.passwords.login({ username: 'omar', password: 'Brand-new-1' }, IP)).resolves.toBeTruthy();
    expect(w.auth.revoked).toEqual(['p-teacher']);
    expect(w.audit.entries.map((e) => e.action)).toEqual(['password_reset']);
  });

  it('a child\'s first sign-in: the code goes to the guardian, the child picks the password, one student login is made', async () => {
    const w = signInWorld();
    await forgot(w, 'AB-1234');
    expect(w.codes.rows[0]?.purpose).toBe('set_password');
    await w.passwords.reset({ identifier: 'ab1234', code: w.send.lastTo(PHONES.guardian), password: 'Child-pass-1' }, IP, 8);
    const profileId = w.subjects.students[0]?.profileId;
    expect(w.subjects.profiles.filter((p) => p.role === 'student')).toEqual([expect.objectContaining({ id: profileId, phone: null })]);
    await expect(w.passwords.login({ username: 'AB-1234', password: 'Child-pass-1' }, IP)).resolves.toBeTruthy();
    expect(w.audit.entries.map((e) => e.action)).toEqual(['profile_provisioned', 'password_set']);
    // Later forgets use reset_password on the same login.
    await forgot(w, 'AB-1234');
    expect(w.codes.rows.at(-1)?.purpose).toBe('reset_password');
  });

  it('checks the password before touching the code', async () => {
    const w = signInWorld();
    await forgot(w, 'omar');
    const code = w.send.lastTo(PHONES.teacher);
    await expect(w.passwords.reset({ identifier: 'omar', code, password: 'short' }, IP, 8)).rejects.toThrow('password_too_short');
    await expect(w.passwords.reset({ identifier: 'omar', code, password: 'Long-enough-1' }, IP, 8)).resolves.toBeUndefined();
  });

  it('a wrong code, another account\'s code or a reused code are one generic failure', async () => {
    const w = signInWorld();
    await forgot(w, 'omar');
    await forgot(w, 'admin@example.com');
    const teacherCode = w.send.lastTo(PHONES.teacher);
    await expect(w.passwords.reset({ identifier: 'admin@example.com', code: teacherCode, password: 'Long-enough-1' }, IP, 8)).rejects.toThrow('invalid_code');
    await w.passwords.reset({ identifier: 'omar', code: teacherCode, password: 'Long-enough-1' }, IP, 8);
    await expect(w.passwords.reset({ identifier: 'omar', code: teacherCode, password: 'Long-enough-2' }, IP, 8)).rejects.toThrow('invalid_code');
    await expect(w.passwords.reset({ identifier: 'ghost', code: '123456', password: 'Long-enough-2' }, IP, 8)).rejects.toThrow('invalid_code');
  });

  it('a sign-in code never resets a password (purposes are separate)', async () => {
    const w = signInWorld();
    await w.family.request({ phone: PHONES.guardian }, IP);
    await w.kit.idle();
    const signInCode = w.send.lastTo(PHONES.guardian);
    await expect(w.passwords.reset({ identifier: 'AB-1234', code: signInCode, password: 'Child-pass-1' }, IP, 8)).rejects.toThrow('invalid_code');
  });
});
