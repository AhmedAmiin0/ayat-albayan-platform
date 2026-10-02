import { describe, expect, it } from 'vitest';
import { resolveMeetingLink } from './meeting-link';

const TEACHER = 'https://meet.jit.si/abrar';
const OWN = 'https://meet.google.com/abc-defg-hij';
const RULE = 'https://zoom.us/j/1';

describe('resolveMeetingLink — docs/10 invariant 3 (R-LES-01, issue B8)', () => {
  it("the rule's own link wins", () => {
    expect(resolveMeetingLink({ explicit: RULE, studentOverrides: [OWN], teacherLink: TEACHER })).toBe(RULE);
  });

  it("then a single student's override", () => {
    expect(resolveMeetingLink({ explicit: null, studentOverrides: [OWN], teacherLink: TEACHER })).toBe(OWN);
  });

  it('groups skip the student override and use the teacher link', () => {
    expect(
      resolveMeetingLink({ explicit: null, studentOverrides: [OWN, null], teacherLink: TEACHER }),
    ).toBe(TEACHER);
  });

  it("then the teacher's fixed link, else null", () => {
    expect(resolveMeetingLink({ explicit: undefined, studentOverrides: [null], teacherLink: TEACHER })).toBe(TEACHER);
    expect(resolveMeetingLink({ explicit: null, studentOverrides: [], teacherLink: null })).toBeNull();
  });

  it('an empty string counts as no link', () => {
    expect(resolveMeetingLink({ explicit: '', studentOverrides: [''], teacherLink: TEACHER })).toBe(TEACHER);
  });
});
