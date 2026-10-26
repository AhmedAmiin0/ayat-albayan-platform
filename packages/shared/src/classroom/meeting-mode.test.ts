import { describe, expect, it } from 'vitest';
import { teacherUpdateSchema } from '../schemas/people/people.js';
import { meetingModeOf, TEACHER_MEETING_MODES, usesPlatform } from './meeting-mode.js';

describe('usesPlatform', () => {
  it('follows the academy switch when the teacher has no mode', () => {
    expect(usesPlatform(null, true)).toBe(true);
    expect(usesPlatform(null, false)).toBe(false);
  });

  it("the teacher's own mode wins over the academy switch", () => {
    expect(usesPlatform('platform', false)).toBe(true);
    expect(usesPlatform('static', true)).toBe(false);
    expect(usesPlatform('platform', true)).toBe(true);
    expect(usesPlatform('static', false)).toBe(false);
  });
});

describe('meetingModeOf', () => {
  it('keeps the two modes and reads anything else as the academy default', () => {
    for (const mode of TEACHER_MEETING_MODES) expect(meetingModeOf(mode)).toBe(mode);
    expect(meetingModeOf(null)).toBeNull();
    expect(meetingModeOf(undefined)).toBeNull();
    expect(meetingModeOf('zoom')).toBeNull();
  });
});

describe('teacher DTO meeting_mode', () => {
  it('accepts the two modes or null (the academy default) and rejects anything else', () => {
    for (const meeting_mode of ['static', 'platform', null]) {
      expect(teacherUpdateSchema.safeParse({ meeting_mode }).success).toBe(true);
    }
    expect(teacherUpdateSchema.safeParse({ meeting_mode: 'zoom' }).success).toBe(false);
    expect(teacherUpdateSchema.safeParse({ meeting_mode: true }).success).toBe(false);
  });
});
