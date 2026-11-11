import type { UserCreate } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { ADMIN_ACTOR, setupUsers, type Link } from '@/modules/people/users/users.fakes';

const base: UserCreate = {
  email: 't@example.com',
  full_name: 'المعلمة',
  role: 'teacher',
  credential: 'generate',
  linked_id: 't1',
};
const teacher = (): Link => ({
  kind: 'teacher',
  id: 't1',
  name: 'المعلمة',
  code: null,
  profile_id: null,
});

describe("POST /users: a teacher login takes the record's phone (docs/46 A7)", () => {
  it('copies it when the admin leaves the phone empty', async () => {
    const { creator, store } = setupUsers(undefined, [teacher()]);
    await creator.create(base, ADMIN_ACTOR);
    expect(store.adopted).toEqual([{ teacherId: 't1', profileId: 'auth-1' }]);
  });

  it('keeps a typed phone, and never copies for another kind of link', async () => {
    const typed = setupUsers(undefined, [teacher()]);
    await typed.creator.create({ ...base, phone_e164: '+966501234567' }, ADMIN_ACTOR);
    expect(typed.store.adopted).toEqual([]);
    const student = setupUsers(undefined, [
      { kind: 'student', id: 's1', name: 'سارة', code: 'AB-0183', profile_id: null },
    ]);
    await student.creator.create({ ...base, role: 'student', linked_id: 's1' }, ADMIN_ACTOR);
    expect(student.store.adopted).toEqual([]);
  });
});
