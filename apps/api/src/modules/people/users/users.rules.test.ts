import { USER_ROLES } from '@ab/catalog';
import { describe, expect, it } from 'vitest';
import { assertMayList, RECORD_WRITE } from './users.rules';

describe('RECORD_WRITE: the table permission behind a login (docs/62 part 2 §1)', () => {
  it('gives each record role its write permission and the other roles none', () => {
    expect(Object.isFrozen(RECORD_WRITE)).toBe(true);
    expect(USER_ROLES.map((r) => RECORD_WRITE[r])).toEqual([
      null,
      'teachers.write',
      'guardians.write',
      null,
      null,
      'students.write',
    ]);
  });

  it('the picker of a record kind needs its write permission', () => {
    const actor = { id: 'a1', permissions: ['students.write' as const] };
    expect(() => assertMayList(actor, 'student')).not.toThrow();
    expect(() => assertMayList(actor, 'teacher')).toThrow();
  });
});
