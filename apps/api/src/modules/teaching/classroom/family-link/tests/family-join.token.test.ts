import { looksLikeFamilyToken } from '@ab/schedule';
import { describe, expect, it } from 'vitest';
import { signPair } from '@/common/http/pair-token';
import {
  familyJoinExpiry,
  signFamilyJoin,
  verifyFamilyJoin,
} from '@/modules/teaching/classroom/family-link/family-join.token';
import { looksLikeLinkToken } from '@/modules/teaching/classroom/join/join-link.token';

const SECRET = 's'.repeat(40);
const LESSON = '00000000-0000-4000-8000-0000000000d1';
const STUDENT = '00000000-0000-4000-8000-0000000000c1';
const exp = familyJoinExpiry('2026-10-05T19:00:00.000Z');
const payload = { lessonId: LESSON, studentId: STUDENT, exp };
const before = new Date('2026-10-05T16:00:00Z');
const token = signFamilyJoin(SECRET, payload);

describe('the family join token (/join/<token> from the family app)', () => {
  it('round-trips the lesson and student in 70 url-safe characters with no dot', () => {
    expect(token).toMatch(/^[A-Za-z0-9_-]{70}$/);
    expect(looksLikeFamilyToken(token)).toBe(true);
    expect(looksLikeLinkToken(token)).toBe(false);
    expect(verifyFamilyJoin(SECRET, token, before)).toEqual(payload);
  });

  it('dies when the room closes', () => {
    expect(exp * 1000).toBe(Date.parse('2026-10-05T19:00:00.000Z'));
    expect(verifyFamilyJoin(SECRET, token, new Date('2026-10-05T18:59:59Z'))).not.toBeNull();
    expect(verifyFamilyJoin(SECRET, token, new Date('2026-10-05T19:00:00Z'))).toBeNull();
  });

  it('refuses another secret and a tampered body or signature', () => {
    expect(verifyFamilyJoin('x'.repeat(40), token, before)).toBeNull();
    const flip = token.startsWith('B') ? 'C' : 'B';
    expect(verifyFamilyJoin(SECRET, `${flip}${token.slice(1)}`, before)).toBeNull();
    const last = token.endsWith('A') ? 'B' : 'A';
    expect(verifyFamilyJoin(SECRET, `${token.slice(0, -1)}${last}`, before)).toBeNull();
  });

  it('refuses the same pair signed for another use (wrong context), dotted or not', () => {
    const pair = { a: LESSON, b: STUDENT, exp };
    const teacher = signPair({ secret: SECRET, context: 'teacher-join|' }, pair);
    expect(verifyFamilyJoin(SECRET, teacher.replace('.', ''), before)).toBeNull();
    const plain = signPair({ secret: SECRET, context: '' }, pair);
    expect(verifyFamilyJoin(SECRET, plain, before)).toBeNull();
    expect(verifyFamilyJoin(SECRET, plain.replace('.', ''), before)).toBeNull();
  });

  it.each([
    'garbage',
    '',
    'abcdefghijklmnopqrstuvwxyz012345',
    `${'A'.repeat(48)}.${'A'.repeat(22)}`,
  ])('refuses the garbled token %j', (bad) => {
    expect(verifyFamilyJoin(SECRET, bad, before)).toBeNull();
  });
});
