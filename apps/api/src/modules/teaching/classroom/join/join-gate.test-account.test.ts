import { describe, expect, it } from 'vitest';
import { windowCheckFor } from './join-gate';

// docs/56: a test login on a test lesson skips the join window, never the end-for-everyone stamp.
const BOTH_TEST = { userIsTest: true, studentIsTest: true };
const NOW = new Date('2026-11-17T08:00:00Z');
const LATER = { starts_at: '2026-11-17T12:00:00Z', ends_at: '2026-11-17T13:00:00Z' };
const codeOf = (run: () => void): unknown => {
  try {
    run();
    return 'entered';
  } catch (e) {
    return (e as { getResponse: () => { code: string } }).getResponse().code;
  }
};

describe('windowCheckFor', () => {
  it('a test login on a test lesson enters before the window', () => {
    expect(codeOf(() => windowCheckFor(BOTH_TEST)(LATER, NOW))).toBe('entered');
  });

  it('a lesson ended for everyone stays closed to a test login', () => {
    const ended = { ...LATER, room_ended_at: '2026-11-17T07:00:00Z' };
    expect(codeOf(() => windowCheckFor(BOTH_TEST)(ended, NOW))).toBe('lesson_ended');
  });

  it('a test login on a real lesson keeps the window', () => {
    const flags = { userIsTest: true, studentIsTest: false };
    expect(codeOf(() => windowCheckFor(flags)(LATER, NOW))).toBe('join_not_open_yet');
  });
});
