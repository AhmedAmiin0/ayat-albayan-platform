import { describe, expect, it } from 'vitest';
import { signInWorld } from '@/modules/people/sign-in/sign-in.world';

const IP = '203.0.113.3';

describe('POST /auth/login: username + password on an isolated client (docs/30 §5)', () => {
  it("a teacher signs in with the username (any case); an email is GoTrue's, never relayed here", async () => {
    const w = signInWorld();
    await expect(
      w.passwords.login({ username: 'Omar', password: 'Teacher-pass-1' }, IP),
    ).resolves.toMatchObject({ access_token: 'at-p-teacher' });
    await expect(
      w.passwords.login({ username: 'teacher@example.com', password: 'Teacher-pass-1' }, IP),
    ).rejects.toThrow('invalid_credentials');
  });

  it('a child signs in with the student code in any case', async () => {
    const w = signInWorld();
    w.auth.users.push({ id: 'p-s1', email: 's-s1@family.invalid', password: 'Child-pass-1' });
    const student = w.subjects.students[0];
    if (student) student.profileId = 'p-s1';
    for (const username of ['AB-1234', 'ab-1234', 'ab1234']) {
      await expect(
        w.passwords.login({ username, password: 'Child-pass-1' }, IP),
      ).resolves.toMatchObject({ access_token: 'at-p-s1' });
    }
  });

  it("a teacher signs in with her phone in any format (docs/46 A5); an admin's phone does not", async () => {
    const w = signInWorld();
    const session = w.passwords.login(
      { username: '00966 50 000 0002', password: 'Teacher-pass-1' },
      IP,
    );
    await expect(session).resolves.toMatchObject({ access_token: 'at-p-teacher' });
    const admin = w.passwords.login({ username: '+966500000003', password: 'Admin-pass-1' }, IP);
    await expect(admin).rejects.toThrow('invalid_credentials');
  });

  it('one generic failure for a wrong password, an unknown name, a student without a login and a phone', async () => {
    const w = signInWorld();
    for (const username of ['omar', 'nobody', 'AB-1234', '+966500000009']) {
      await expect(
        w.passwords.login(
          { username, password: username === 'omar' ? 'wrong' : 'Teacher-pass-1' },
          IP,
        ),
      ).rejects.toThrow('invalid_credentials');
    }
  });

  it('429 after 10 tries for one name, whatever the spelling', async () => {
    const w = signInWorld();
    for (let i = 0; i < 10; i += 1)
      await w.passwords
        .login({ username: i % 2 ? 'OMAR' : 'omar', password: 'x' }, `10.1.1.${i}`)
        .catch(() => undefined);
    await expect(
      w.passwords.login({ username: ' Omar ', password: 'Teacher-pass-1' }, '10.1.1.99'),
    ).rejects.toThrow('too_many_requests');
  });
});
