import { describe, expect, it } from 'vitest';
import { isLinkedRole, needsExistingRecord, normalizeStudentCode, passwordProblem, STAFF_BASE_ROLES } from './validation.js';

describe('passwordProblem', () => {
  it('flags blank, short and long passwords against the configured minimum', () => {
    expect(passwordProblem('   ')).toBe('blank');
    expect(passwordProblem('abc1234')).toBe('too_short');
    expect(passwordProblem('abc1234', 6)).toBeNull();
    expect(passwordProblem('x'.repeat(73))).toBe('too_long');
    expect(passwordProblem('x'.repeat(8))).toBeNull();
  });
});

describe('role helpers', () => {
  it('links teacher, student and guardian logins to a record; students and guardians must already exist', () => {
    expect(['teacher', 'student', 'guardian', 'admin', 'sales', 'assistant'].map((r) => isLinkedRole(r as never))).toEqual([true, true, true, false, false, false]);
    expect(needsExistingRecord('student')).toBe(true);
    expect(needsExistingRecord('guardian')).toBe(true);
    expect(needsExistingRecord('teacher')).toBe(false);
  });
  it('keeps staff roles apart from students and guardians', () => {
    expect(STAFF_BASE_ROLES).toEqual(['admin', 'teacher', 'assistant', 'sales']);
  });
});

describe('normalizeStudentCode', () => {
  it.each([['ab-0183', 'AB-0183'], ['AB183', 'AB-0183'], [' ab-12345 ', 'AB-12345']])('%s → %s', (input, out) => {
    expect(normalizeStudentCode(input)).toBe(out);
  });
  it('rejects anything else', () => {
    expect(normalizeStudentCode('Ahmed')).toBeNull();
  });
});
