import { describe, expect, it } from 'vitest';
import { FakeAudit } from '../sign-in.fakes';
import { FakeAuth, FakeSubjects, PHONES } from '../sign-in.fakes.accounts';
import { familyEmail, Provisioner } from './provision';

const setup = () => {
  const subjects = new FakeSubjects();
  const auth = new FakeAuth();
  return { subjects, auth, provision: new Provisioner(subjects, auth, new FakeAudit().asPort()) };
};

describe('lazy provisioning (docs/30 §2)', () => {
  it('uses the synthetic .invalid email, never a real address', () => {
    expect(familyEmail('g', 'abc')).toBe('g-abc@family.invalid');
  });

  it('a lost race (the record got a login meanwhile) removes what it made and uses the winner', async () => {
    const { subjects, auth, provision } = setup();
    const guardian = subjects.guardians[0];
    if (!guardian) throw new Error('fixture');
    subjects.link = async () => {
      guardian.profileId = 'p-winner';
      return false;
    };
    subjects.profiles.push({ id: 'p-winner', role: 'guardian', disabled: false, phone: null });
    await expect(provision.guardian({ ...guardian })).resolves.toBe('p-winner');
    expect(auth.users.filter((u) => u.email.endsWith('@family.invalid'))).toEqual([]);
  });

  it('a failed profile write removes the new auth user (no orphan login)', async () => {
    const { subjects, auth, provision } = setup();
    subjects.insertProfile = async () => {
      throw new Error('db down');
    };
    const guardian = subjects.guardians[0];
    if (!guardian) throw new Error('fixture');
    await expect(provision.guardian(guardian)).rejects.toThrow('db down');
    expect(auth.users.filter((u) => u.email.endsWith('@family.invalid'))).toEqual([]);
  });

  it('adopts an auth user left by a failed attempt instead of making a second one', async () => {
    const { subjects, auth, provision } = setup();
    auth.users.push({ id: 'u-left', email: familyEmail('s', 's1'), password: null });
    const student = subjects.students[0];
    if (!student) throw new Error('fixture');
    await expect(provision.student(student, 'Child-pass-1')).resolves.toBe('u-left');
    expect(auth.users.find((u) => u.id === 'u-left')?.password).toBe('Child-pass-1');
    expect(subjects.students[0]?.profileId).toBe('u-left');
  });

  it('a guardian phone held by a non-staff profile gets a login without the phone', async () => {
    const { subjects, provision } = setup();
    subjects.profiles.push({ id: 'p-other', role: 'student', disabled: false, phone: PHONES.guardian });
    const guardian = subjects.guardians[0];
    if (!guardian) throw new Error('fixture');
    const id = await provision.guardian(guardian);
    expect(subjects.profiles.find((p) => p.id === id)).toMatchObject({ role: 'guardian', phone: null });
  });
});
