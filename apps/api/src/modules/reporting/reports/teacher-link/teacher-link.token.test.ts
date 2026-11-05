import { describe, expect, it } from 'vitest';
import { signToken } from '@/modules/teaching/feedback/public/feedback.token';
import { signTeacherLink, teacherLinkExpiry, verifyTeacherLink } from './teacher-link.token';

const SECRET = 's'.repeat(40);
const LESSON = '00000000-0000-4000-8000-0000000000d1';
const TEACHER = '00000000-0000-4000-8000-0000000000b1';
const NOW = new Date('2026-11-05T12:00:00Z');
const EXP = Math.floor(NOW.getTime() / 1000) + 3600;
const token = (exp = EXP) => signTeacherLink(SECRET, { lessonId: LESSON, teacherId: TEACHER, exp });
const flip = (s: string) => (s.endsWith('A') ? `${s.slice(0, -1)}B` : `${s.slice(0, -1)}A`);

describe('teacher report link token (docs/19 «Teacher report link»)', () => {
  it('round-trips the lesson, the teacher and the expiry; 71 characters', () => {
    expect(verifyTeacherLink(SECRET, token(), NOW)).toEqual({
      ok: true,
      payload: { lessonId: LESSON, teacherId: TEACHER, exp: EXP },
    });
    expect(token()).toHaveLength(71);
  });

  it('expires at the lesson end + the edit hours', () => {
    expect(teacherLinkExpiry('2026-11-05T12:45:00Z', 24)).toBe(
      Date.parse('2026-11-06T12:45:00Z') / 1000,
    );
    expect(verifyTeacherLink(SECRET, token(), new Date(EXP * 1000))).toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it('refuses a tampered body or signature and another secret', () => {
    const [body, sig] = token().split('.') as [string, string];
    expect(verifyTeacherLink(SECRET, `${flip(body)}.${sig}`, NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
    expect(verifyTeacherLink(SECRET, `${body}.${flip(sig)}`, NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
    expect(verifyTeacherLink('t'.repeat(40), token(), NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
    expect(verifyTeacherLink(SECRET, 'abc', NOW)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('a family feedback token signed with the same secret never opens a report (its own context)', () => {
    const feedback = signToken(SECRET, { lessonId: LESSON, studentId: TEACHER, exp: EXP });
    expect(verifyTeacherLink(SECRET, feedback, NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });
});
