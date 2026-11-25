import { describe, expect, it } from 'vitest';
import { errorCode } from '@/common/http/errors';
import { PHONES } from '@/modules/people/sign-in/sign-in.fakes.accounts';
import { signInWorld } from '@/modules/people/sign-in/sign-in.world';

// A family's second number and a student's own number sign in too (phone first).

const IP = '203.0.113.7';
type World = ReturnType<typeof signInWorld>;

async function signIn(w: World, phone: string) {
  await w.family.request({ phone }, IP);
  await w.kit.idle();
  return w.family.verify({ phone, code: w.send.lastTo(phone) }, IP);
}

const failure = (p: Promise<unknown>) => p.then(() => 'signed in', (e: unknown) => errorCode(e));
const codeLogins = (w: World) => w.auth.users.filter((u) => u.email.endsWith('@family.invalid'));

/** g1's second number, or s1's own one, is now this number instead (one per family / student). */
function numberIs(w: World, phone: string, studentId: string | null) {
  w.subjects.numbers = w.subjects.numbers.filter((n) => n.studentId !== studentId);
  w.subjects.numbers.push({ phone, guardianId: 'g1', studentId });
}

/** s1 already has a login of its own (made by its first password, or by staff). */
function studentLogin(w: World, login: { role: 'student' | 'guardian'; disabled: boolean }) {
  w.subjects.profiles.push({ id: 'p-s1', phone: null, ...login });
  w.auth.users.push({ id: 'p-s1', email: 's-s1@family.invalid', password: 'Child-pass-1' });
  const child = w.subjects.students[0];
  if (child) child.profileId = 'p-s1';
}

describe("a family's second number", () => {
  it('gets its own code and opens the same guardian login as the main number', async () => {
    const w = signInWorld();
    const session = await signIn(w, PHONES.second);
    expect(w.send.sent.map((s) => s.phone)).toEqual([PHONES.second]);
    expect(w.codes.rows[0]?.subject).toEqual({ kind: 'guardian', id: 'g1' });
    expect(session.token_hash).toBe('hash-of-g-g1@family.invalid');
    await signIn(w, PHONES.guardian);
    expect(codeLogins(w)).toHaveLength(1);
    const guardian = w.subjects.profiles.find((p) => p.role === 'guardian');
    expect(guardian?.phone).toBe(PHONES.guardian);
  });

  it("an admin's number is refused after a right code, and nothing is made", async () => {
    const w = signInWorld();
    numberIs(w, PHONES.admin, null);
    expect(await failure(signIn(w, PHONES.admin))).toBe('phone_belongs_to_staff');
    expect(codeLogins(w)).toEqual([]);
  });

  it('a family that already has a login, reached through a staff number: 409, no session', async () => {
    const w = signInWorld();
    await signIn(w, PHONES.guardian);
    numberIs(w, PHONES.admin, null);
    expect(await failure(signIn(w, PHONES.admin))).toBe('phone_belongs_to_staff');
    expect(w.auth.links).toHaveLength(1);
  });

  it('a code opens only with the number it was sent to (one subject, two numbers)', async () => {
    const w = signInWorld();
    await w.family.request({ phone: PHONES.second }, IP);
    await w.kit.idle();
    const code = w.send.lastTo(PHONES.second);
    const typedMain = w.family.verify({ phone: PHONES.guardian, code }, IP);
    expect(await failure(typedMain)).toBe('invalid_code');
    const session = await w.family.verify({ phone: PHONES.second, code }, IP);
    expect(session.token_hash).toBe('hash-of-g-g1@family.invalid');
  });
});

describe("a student's own number", () => {
  it('gets the code and makes the student login once (no password, no phone copy)', async () => {
    const w = signInWorld();
    const session = await signIn(w, PHONES.student);
    expect(w.send.sent.map((s) => s.phone)).toEqual([PHONES.student]);
    expect(w.codes.rows[0]?.subject).toEqual({ kind: 'student', id: 's1' });
    expect(session.token_hash).toBe('hash-of-s-s1@family.invalid');
    const profileId = w.subjects.students[0]?.profileId;
    expect(w.subjects.profiles.filter((p) => p.role === 'student')).toEqual([
      expect.objectContaining({ id: profileId, phone: null }),
    ]);
    expect(w.auth.users.find((u) => u.id === profileId)?.password).toBeNull();
    expect(w.audit.entries.at(-1)?.after).toEqual({ via: 'student_phone' });
    await signIn(w, PHONES.student);
    expect(codeLogins(w)).toHaveLength(1);
  });

  it('a child with a password login gets that same login', async () => {
    const w = signInWorld();
    studentLogin(w, { role: 'student', disabled: false });
    const session = await signIn(w, PHONES.student);
    expect(session.token_hash).toBe('hash-of-s-s1@family.invalid');
    expect(codeLogins(w)).toHaveLength(1);
  });

  it.each([
    ['a disabled student login', { role: 'student', disabled: true }],
    ['a login of another role', { role: 'guardian', disabled: false }],
  ] as const)('%s stays refused (403 after a right code)', async (_name, login) => {
    const w = signInWorld();
    studentLogin(w, login);
    expect(await failure(signIn(w, PHONES.student))).toBe('account_disabled');
  });

  it("a teacher login holding the child's number does not block the child", async () => {
    const w = signInWorld();
    const teacher = w.subjects.profiles.find((p) => p.id === 'p-teacher');
    if (teacher) teacher.phone = PHONES.student;
    expect(await failure(signIn(w, PHONES.student))).toBe('signed in');
  });

  it("an admin's number as the child's own: 409 after a right code, no student login", async () => {
    const w = signInWorld();
    numberIs(w, PHONES.admin, 's1');
    expect(await failure(signIn(w, PHONES.admin))).toBe('phone_belongs_to_staff');
    expect(w.auth.users.some((u) => u.email === 's-s1@family.invalid')).toBe(false);
  });

  it('a student sign-in code never sets a password', async () => {
    const w = signInWorld();
    await w.family.request({ phone: PHONES.student }, IP);
    await w.kit.idle();
    const reset = { identifier: 'AB-1234', code: w.send.lastTo(PHONES.student), password: 'New-pass-123' };
    expect(await failure(w.passwords.reset(reset, IP, 8))).toBe('invalid_code');
  });
});
