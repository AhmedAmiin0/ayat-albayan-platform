import { describe, expect, it } from 'vitest';
import { signPair } from '@/common/http/pair-token';
import { joinExpiry, signTeacherJoin, verifyTeacherJoin } from './join-token';

const SECRET = 's'.repeat(40);
const LESSON = '00000000-0000-4000-8000-0000000000d1';
const TEACHER = '00000000-0000-4000-8000-0000000000b1';
const exp = joinExpiry('2026-11-06T12:30:00Z');
const payload = { lessonId: LESSON, teacherId: TEACHER, exp };
const before = new Date('2026-11-06T12:00:00Z');

describe('the teacher join token (GET /join/:token)', () => {
  it('round-trips the lesson and teacher, 71 characters', () => {
    const token = signTeacherJoin(SECRET, payload);
    expect(token).toHaveLength(71);
    expect(verifyTeacherJoin(SECRET, token, before)).toEqual(payload);
  });

  it('expires two hours after the lesson ends', () => {
    const token = signTeacherJoin(SECRET, payload);
    expect(exp * 1000).toBe(Date.parse('2026-11-06T14:30:00Z'));
    expect(verifyTeacherJoin(SECRET, token, new Date('2026-11-06T14:29:59Z'))).not.toBeNull();
    expect(verifyTeacherJoin(SECRET, token, new Date('2026-11-06T14:30:00Z'))).toBeNull();
  });

  it('refuses another secret, a tampered body, and the report / feedback tokens of the same pair', () => {
    const token = signTeacherJoin(SECRET, payload);
    expect(verifyTeacherJoin('x'.repeat(40), token, before)).toBeNull();
    const flip = token.startsWith('B') ? 'C' : 'B';
    expect(verifyTeacherJoin(SECRET, `${flip}${token.slice(1)}`, before)).toBeNull();
    const pair = { a: LESSON, b: TEACHER, exp };
    const report = signPair({ secret: SECRET, context: 'teacher-report|' }, pair);
    expect(verifyTeacherJoin(SECRET, report, before)).toBeNull();
    const feedback = signPair({ secret: SECRET, context: '' }, pair);
    expect(verifyTeacherJoin(SECRET, feedback, before)).toBeNull();
    expect(verifyTeacherJoin(SECRET, 'garbage', before)).toBeNull();
  });
});
