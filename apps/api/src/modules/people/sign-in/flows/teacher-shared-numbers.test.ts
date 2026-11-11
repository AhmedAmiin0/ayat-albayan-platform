import { describe, expect, it } from 'vitest';
import { PHONES } from '@/modules/people/sign-in/sign-in.fakes.accounts';
import { signInWorld } from '@/modules/people/sign-in/sign-in.world';

const IP = '203.0.113.8';
const SHARED = PHONES.guardian;
type World = ReturnType<typeof signInWorld>;

/** t-new's record carries the family's number: a teacher who is also a parent. */
function sharedWorld(): World {
  const w = signInWorld();
  const t = w.subjects.teachers.find((x) => x.id === 't-new');
  if (t) t.recordPhone = SHARED;
  return w;
}

async function teacherSignIn(w: World): Promise<void> {
  await w.teachers.request({ phone: SHARED }, IP);
  await w.kit.idle();
  await w.teachers.verify({ phone: SHARED, code: w.send.lastTo(SHARED) }, IP);
}

async function familySignIn(w: World): Promise<void> {
  await w.family.request({ phone: SHARED }, IP);
  await w.kit.idle();
  await w.family.verify({ phone: SHARED, code: w.send.lastTo(SHARED) }, IP);
}

const roleOf = (w: World, role: string) =>
  w.subjects.profiles.filter((p) => p.role === role && p.id.startsWith('u-'));

describe('a teacher who is also a parent (docs/46 «Shared numbers»)', () => {
  it('parent first: the teacher login leaves the number to the family; both keep signing in', async () => {
    const w = sharedWorld();
    await familySignIn(w);
    await teacherSignIn(w);
    expect(roleOf(w, 'guardian')).toEqual([expect.objectContaining({ phone: SHARED })]);
    expect(roleOf(w, 'teacher')).toEqual([expect.objectContaining({ phone: null })]);
    await expect(familySignIn(w)).resolves.toBeUndefined();
  });

  it('teacher first: no 409 for the family afterwards, the guardian login gets the number', async () => {
    const w = sharedWorld();
    await teacherSignIn(w);
    expect(roleOf(w, 'teacher')).toEqual([expect.objectContaining({ phone: null })]);
    await familySignIn(w);
    expect(roleOf(w, 'guardian')).toEqual([expect.objectContaining({ phone: SHARED })]);
  });

  it('an older teacher login holding the number: the guardian login is made without it', async () => {
    const w = signInWorld();
    w.subjects.guardians.push({
      id: 'g2',
      name: 'معلم وولي أمر',
      phone: PHONES.teacher,
      tz: 'Africa/Cairo',
      profileId: null,
    });
    await w.family.request({ phone: PHONES.teacher }, IP);
    await w.kit.idle();
    await w.family.verify({ phone: PHONES.teacher, code: w.send.lastTo(PHONES.teacher) }, IP);
    expect(roleOf(w, 'guardian')).toEqual([expect.objectContaining({ phone: null })]);
  });

  it("phone + password finds the teacher through her record, not the parent's login (A5)", async () => {
    const w = sharedWorld();
    await familySignIn(w);
    await teacherSignIn(w);
    const login = roleOf(w, 'teacher')[0];
    const user = w.auth.users.find((u) => u.id === login?.id);
    if (user) user.password = 'Teacher-new-1';
    const session = await w.passwords.login(
      { username: '00966 50 000 0001', password: 'Teacher-new-1' },
      IP,
    );
    expect(session.access_token).toBe(`at-${login?.id ?? ''}`);
  });
});
