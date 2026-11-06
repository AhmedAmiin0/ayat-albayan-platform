import { describe, expect, it } from 'vitest';
import {
  reportSessionCookie,
  reportSessionToken,
  sessionFromCookie,
  validReportSession,
} from './report-session';

const pepper = 'test-pepper-not-a-secret';
const now = new Date('2026-11-06T12:00:00Z');
const A = '00000000-0000-4000-8000-0000000000f1';
const B = '00000000-0000-4000-8000-0000000000f2';

describe('report session: one report, 30 minutes', () => {
  it('a token opens its own report until it expires', () => {
    const token = reportSessionToken({ pepper, reportId: A, now });
    expect(validReportSession({ pepper, reportId: A, token, now })).toBe(true);
    const later = new Date(now.getTime() + 29 * 60_000);
    expect(validReportSession({ pepper, reportId: A, token, now: later })).toBe(true);
    const expired = new Date(now.getTime() + 31 * 60_000);
    expect(validReportSession({ pepper, reportId: A, token, now: expired })).toBe(false);
  });

  it('another report, another pepper, a changed expiry or junk: denied', () => {
    const token = reportSessionToken({ pepper, reportId: A, now });
    expect(validReportSession({ pepper, reportId: B, token, now })).toBe(false);
    expect(validReportSession({ pepper: 'other', reportId: A, token, now })).toBe(false);
    const [exp, sig] = token.split('.');
    const longer = `${Number(exp) + 3600}.${sig ?? ''}`;
    expect(validReportSession({ pepper, reportId: A, token: longer, now })).toBe(false);
    for (const junk of ['', 'x', `${exp ?? ''}.`, '1.abc']) {
      expect(validReportSession({ pepper, reportId: A, token: junk, now })).toBe(false);
    }
  });

  it("the cookie: HttpOnly, Secure, Lax, this report's public routes only; read back from a header", () => {
    const cookie = reportSessionCookie('aaaabbbbccccddddeeeeffff00001111', 'tok.en');
    expect(cookie).toContain('Path=/public/report-pages/aaaabbbbccccddddeeeeffff00001111;');
    expect(cookie).toContain('Max-Age=1800; HttpOnly; Secure; SameSite=Lax');
    expect(sessionFromCookie('a=1; ab_report=tok.en; b=2')).toBe('tok.en');
    expect(sessionFromCookie(undefined)).toBe('');
  });
});
