import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { UserLinksRepo } from './user-links.repo';

const teacher = {
  profile_id: 'u1',
  display_name_ar: 'أ. عمر',
  display_name_en: null,
  gender: 'male',
  phone_e164: '+966501234567',
  tz: 'Asia/Riyadh',
} as const;

describe('UserLinksRepo', () => {
  it('creates an active teacher record and returns its id', async () => {
    const { db, argsOf } = fakeDb({ teachers: [{ data: { id: 't1' } }] });
    expect(await new UserLinksRepo(db).createTeacher(teacher)).toBe('t1');
    expect(argsOf('teachers', 'insert')).toEqual([{ ...teacher, status: 'active' }]);
  });

  it('turns a duplicate teacher phone into 409 phone_taken', async () => {
    const { db } = fakeDb({ teachers: [{ error: { code: '23505', message: 'dup' } }] });
    await expect(new UserLinksRepo(db).createTeacher(teacher)).rejects.toMatchObject({
      response: { code: 'phone_taken' },
    });
  });

  it('copies the profile name / phone to the linked teacher record', async () => {
    const { db, argsOf } = fakeDb({ teachers: [{}] });
    await new UserLinksRepo(db).syncTeacher('u1', { display_name_ar: 'أ. عمر' });
    expect(argsOf('teachers', 'update')).toEqual([{ display_name_ar: 'أ. عمر' }]);
    expect(argsOf('teachers', 'eq')).toEqual(['profile_id', 'u1']);
  });
});
