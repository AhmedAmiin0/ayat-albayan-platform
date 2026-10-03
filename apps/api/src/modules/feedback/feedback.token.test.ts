import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { EXP, LESSON_ID, NOW, SECRET, STUDENT_ID, tokenFor } from './feedback.fakes';
import { expiryOf, hashToken, signToken, verifyToken } from './feedback.token';

const flip = (s: string) => (s.endsWith('A') ? `${s.slice(0, -1)}B` : `${s.slice(0, -1)}A`);

describe('feedback link token', () => {
  it('round-trips the lesson, the student and the expiry', () => {
    const r = verifyToken(SECRET, tokenFor(), NOW);
    expect(r).toEqual({ ok: true, payload: { lessonId: LESSON_ID, studentId: STUDENT_ID, exp: EXP } });
  });

  it('is deterministic, so a live link can be rebuilt from its expiry', () => {
    expect(tokenFor()).toBe(tokenFor());
    expect(tokenFor(EXP + 1)).not.toBe(tokenFor());
  });

  it('expires 14 days after issue', () => {
    expect(expiryOf(NOW)).toBe(EXP);
    expect(verifyToken(SECRET, tokenFor(), new Date(EXP * 1000 - 1))).toMatchObject({ ok: true });
    expect(verifyToken(SECRET, tokenFor(), new Date(EXP * 1000))).toEqual({ ok: false, reason: 'expired' });
  });

  it('refuses a tampered signature, a tampered payload and another secret', () => {
    const [body, sig] = tokenFor().split('.') as [string, string];
    expect(verifyToken(SECRET, `${body}.${flip(sig)}`, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
    expect(verifyToken(SECRET, `${flip(body)}.${sig}`, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
    expect(verifyToken('t'.repeat(40), tokenFor(), NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('an extended expiry cannot be forged without the secret', () => {
    const forged = tokenFor(EXP + 86_400).split('.')[0];
    const sig = tokenFor().split('.')[1];
    expect(verifyToken(SECRET, `${forged}.${sig}`, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('refuses malformed input, even when correctly signed', () => {
    for (const t of ['', 'abc', 'a.b.c', '.', `${tokenFor()}.x`]) {
      expect(verifyToken(SECRET, t, NOW).ok).toBe(false);
    }
    const body = Buffer.from('short').toString('base64url');
    const sig = createHmac('sha256', SECRET).update(body).digest().subarray(0, 16).toString('base64url');
    expect(verifyToken(SECRET, `${body}.${sig}`, NOW)).toEqual({ ok: false, reason: 'malformed' });
    expect(() => signToken(SECRET, { lessonId: 'x', studentId: 'y', exp: 1 })).toThrow();
  });

  it('is short enough for a path parameter and a WhatsApp button (71 characters)', () => {
    expect(tokenFor()).toHaveLength(71);
  });

  it('hashes with sha256 hex; different tokens, different hashes', () => {
    expect(hashToken(tokenFor())).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(tokenFor())).not.toBe(hashToken(tokenFor(EXP + 1)));
  });
});
