import { describe, expect, it } from 'vitest';
import { PHONES } from '@/modules/people/sign-in/sign-in.fakes.accounts';
import { signInWorld } from '@/modules/people/sign-in/sign-in.world';

const IP = '203.0.113.7';
type World = ReturnType<typeof signInWorld>;

async function ask(w: World, phone: string): Promise<void> {
  await w.teachers.request({ phone }, IP);
  await w.kit.idle();
}

const teacher = (w: World, id: string) => {
  const t = w.subjects.teachers.find((x) => x.id === id);
  if (!t) throw new Error(`fixture ${id}`);
  return t;
};

describe('teacher code sign-in (docs/46 A2, D2)', () => {
  it('no login yet: the code goes to the record phone; the first right code makes one teacher login', async () => {
    const w = signInWorld({ settings: { family_login_enabled: false } });
    await ask(w, '00966 50 000 0005');
    expect(w.send.sent.map((s) => s.phone)).toEqual([PHONES.newTeacher]);
    const session = await w.teachers.verify(
      { phone: PHONES.newTeacher, code: w.send.lastTo(PHONES.newTeacher) },
      IP,
    );
    expect(session).toEqual({ token_hash: 'hash-of-t-t-new@family.invalid', type: 'magiclink' });
    const profileId = teacher(w, 't-new').profileId;
    expect(w.subjects.profiles.find((p) => p.id === profileId)).toMatchObject({
      role: 'teacher',
      phone: PHONES.newTeacher,
    });
    expect(w.audit.entries.map((e) => [e.action, e.after])).toEqual([
      ['profile_provisioned', { role: 'teacher', record: 'teacher' }],
      ['code_sign_in', { via: 'teacher_phone' }],
    ]);
  });

  it("with a login: only the login's own phone, so a record edit cannot redirect her codes", async () => {
    const w = signInWorld();
    teacher(w, 't-omar').recordPhone = PHONES.other;
    await ask(w, PHONES.other);
    await ask(w, PHONES.teacher);
    expect(w.send.sent.map((s) => s.phone)).toEqual([PHONES.teacher, PHONES.teacher]);
    await expect(
      w.teachers.verify({ phone: PHONES.teacher, code: w.send.lastTo(PHONES.teacher) }, IP),
    ).resolves.toEqual({
      token_hash: 'hash-of-teacher@example.com',
      type: 'magiclink',
    });
  });

  it('a login without a phone gets nothing; the answer is the same', async () => {
    const w = signInWorld();
    const login = w.subjects.profiles.find((p) => p.id === 'p-teacher');
    if (login) login.phone = null;
    await expect(w.teachers.request({ phone: PHONES.teacher }, IP)).resolves.toBeUndefined();
    await w.kit.idle();
    expect(w.send.sent).toEqual([]);
  });

  it('nothing for a guardian, an admin, an inactive teacher, an unknown or a malformed number', async () => {
    const w = signInWorld();
    teacher(w, 't-new').active = false;
    for (const phone of [PHONES.guardian, PHONES.admin, PHONES.newTeacher, PHONES.other, 'x'])
      await ask(w, phone);
    expect(w.send.sent).toEqual([]);
    await expect(
      w.teachers.verify({ phone: PHONES.newTeacher, code: '123456' }, IP),
    ).rejects.toThrow('invalid_code');
  });

  it('a teacher row linked to an admin login: no code is sent, and a code can never open that login', async () => {
    const w = signInWorld();
    Object.assign(teacher(w, 't-new'), { profileId: 'p-admin' });
    await ask(w, PHONES.newTeacher);
    expect(w.send.sent).toEqual([]);
    await w.kit.issue({
      purpose: 'sign_in',
      subject: { kind: 'teacher', id: 't-new' },
      phone: PHONES.newTeacher,
    });
    const code = w.send.lastTo(PHONES.newTeacher);
    await expect(w.teachers.verify({ phone: PHONES.newTeacher, code }, IP)).rejects.toThrow(
      'account_disabled',
    );
    expect(w.auth.links).toEqual([]);
  });

  it('a disabled teacher login stays refused', async () => {
    const w = signInWorld();
    const login = w.subjects.profiles.find((p) => p.id === 'p-teacher');
    if (login) login.disabled = true;
    await ask(w, PHONES.teacher);
    expect(w.send.sent).toEqual([]);
  });

  it("codes are single use and only the teacher subject's code counts", async () => {
    const w = signInWorld();
    await w.family.request({ phone: PHONES.guardian }, IP);
    await ask(w, PHONES.newTeacher);
    const code = w.send.lastTo(PHONES.newTeacher);
    await w.teachers.verify({ phone: PHONES.newTeacher, code }, IP);
    await expect(w.teachers.verify({ phone: PHONES.newTeacher, code }, IP)).rejects.toThrow(
      'invalid_code',
    );
    const family = w.send.lastTo(PHONES.guardian);
    await expect(w.teachers.verify({ phone: PHONES.guardian, code: family }, IP)).rejects.toThrow(
      'invalid_code',
    );
  });

  it('503 while no code can be sent (no pepper)', async () => {
    const w = signInWorld({ pepper: null });
    await expect(
      w.teachers.verify({ phone: PHONES.newTeacher, code: '123456' }, IP),
    ).rejects.toThrow('codes_unavailable');
  });
});
