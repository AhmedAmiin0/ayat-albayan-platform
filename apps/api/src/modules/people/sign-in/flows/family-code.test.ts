import { describe, expect, it } from 'vitest';
import { PHONES } from '../sign-in.fakes.accounts';
import { signInWorld } from '../sign-in.world';

const IP = '203.0.113.1';

async function requestCode(w: ReturnType<typeof signInWorld>, phone: string): Promise<void> {
  await w.family.request({ phone }, IP);
  await w.kit.idle();
}

describe('family sign-in: phone + WhatsApp code (docs/30 §1, §3)', () => {
  it('sends the code to the guardian row\'s phone, whatever format was typed', async () => {
    const w = signInWorld();
    await requestCode(w, '00966 50 000 0001');
    expect(w.send.sent.map((s) => s.phone)).toEqual([PHONES.guardian]);
    expect(w.send.sent[0]?.code).toMatch(/^\d{6}$/);
    expect(w.codes.rows[0]?.hash).not.toContain(w.send.sent[0]?.code);
  });

  it('answers the same way and sends nothing for a missing, a staff or an invalid number', async () => {
    const w = signInWorld();
    for (const phone of [PHONES.other, PHONES.teacher, 'not a phone']) {
      await expect(w.family.request({ phone }, IP)).resolves.toBeUndefined();
    }
    await w.kit.idle();
    expect(w.send.sent).toEqual([]);
    expect(w.codes.rows).toEqual([]);
  });

  it('first verified code makes exactly one guardian login, links it, and returns only the token hash', async () => {
    const w = signInWorld();
    await requestCode(w, PHONES.guardian);
    const session = await w.family.verify({ phone: PHONES.guardian, code: w.send.lastTo(PHONES.guardian) }, IP);
    expect(session).toEqual({ token_hash: 'hash-of-g-g1@family.invalid', type: 'magiclink' });
    const profileId = w.subjects.guardians[0]?.profileId;
    expect(w.subjects.profiles.filter((p) => p.role === 'guardian')).toEqual([expect.objectContaining({ id: profileId, phone: PHONES.guardian })]);
    expect(w.auth.users.filter((u) => u.email.endsWith('@family.invalid'))).toHaveLength(1);
    expect(w.audit.entries.map((e) => e.action)).toEqual(['profile_provisioned', 'code_sign_in']);
    expect(JSON.stringify(w.audit.entries)).not.toMatch(/\d{6}/);
    // A second sign-in reuses the login.
    await requestCode(w, PHONES.guardian);
    await w.family.verify({ phone: PHONES.guardian, code: w.send.lastTo(PHONES.guardian) }, IP);
    expect(w.subjects.profiles.filter((p) => p.role === 'guardian')).toHaveLength(1);
  });

  it('a code works once (no replay)', async () => {
    const w = signInWorld();
    await requestCode(w, PHONES.guardian);
    const code = w.send.lastTo(PHONES.guardian);
    await w.family.verify({ phone: PHONES.guardian, code }, IP);
    await expect(w.family.verify({ phone: PHONES.guardian, code }, IP)).rejects.toThrow('invalid_code');
  });

  it('only the newest code counts', async () => {
    const w = signInWorld();
    await requestCode(w, PHONES.guardian);
    const first = w.send.lastTo(PHONES.guardian);
    await requestCode(w, PHONES.guardian);
    const second = w.send.lastTo(PHONES.guardian);
    if (first !== second) await expect(w.family.verify({ phone: PHONES.guardian, code: first }, IP)).rejects.toThrow('invalid_code');
    await expect(w.family.verify({ phone: PHONES.guardian, code: second }, IP)).resolves.toBeTruthy();
  });

  it('after 5 wrong tries even the right code is refused', async () => {
    const w = signInWorld();
    await requestCode(w, PHONES.guardian);
    const code = w.send.lastTo(PHONES.guardian);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i += 1) await expect(w.family.verify({ phone: PHONES.guardian, code: wrong }, IP)).rejects.toThrow('invalid_code');
    await expect(w.family.verify({ phone: PHONES.guardian, code }, IP)).rejects.toThrow('invalid_code');
  });

  it('an expired code is refused', async () => {
    const w = signInWorld();
    await requestCode(w, PHONES.guardian);
    w.codes.now = () => new Date(Date.now() + 11 * 60_000);
    await expect(w.family.verify({ phone: PHONES.guardian, code: w.send.lastTo(PHONES.guardian) }, IP)).rejects.toThrow('invalid_code');
  });

  it('a guardian phone held by a staff profile is refused clearly, after a right code, and nothing is made', async () => {
    const w = signInWorld();
    w.subjects.guardians.push({ id: 'g2', name: 'معلم وولي أمر', phone: PHONES.teacher, tz: 'Africa/Cairo', profileId: null });
    await requestCode(w, PHONES.teacher);
    await expect(w.family.verify({ phone: PHONES.teacher, code: w.send.lastTo(PHONES.teacher) }, IP)).rejects.toThrow('phone_belongs_to_staff');
    expect(w.auth.users.filter((u) => u.email.endsWith('@family.invalid'))).toEqual([]);
  });

  it('a disabled guardian login stays refused', async () => {
    const w = signInWorld();
    w.subjects.profiles.push({ id: 'p-g1', role: 'guardian', disabled: true, phone: PHONES.guardian });
    const guardian = w.subjects.guardians[0];
    if (guardian) guardian.profileId = 'p-g1';
    await requestCode(w, PHONES.guardian);
    await expect(w.family.verify({ phone: PHONES.guardian, code: w.send.lastTo(PHONES.guardian) }, IP)).rejects.toThrow('account_disabled');
  });
});
