import { describe, expect, it } from 'vitest';
import { isStaff } from './sign-in.roles';

describe('isStaff', () => {
  it('is every base role but the family ones', () => {
    expect(isStaff('admin')).toBe(true);
    expect(isStaff('teacher')).toBe(true);
    expect(isStaff('guardian')).toBe(false);
    expect(isStaff('student')).toBe(false);
  });
});
