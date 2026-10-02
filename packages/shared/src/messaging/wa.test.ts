import { describe, expect, it } from 'vitest';
import {
  backoff,
  canRetryCode,
  clickToChatLink,
  isRetryableWaError,
  isWaAuthError,
  MAX_SEND_ATTEMPTS,
  SESSION_WINDOW_MS,
  sessionWindowOpen,
  waIdToE164,
} from './wa.js';

describe('waIdToE164 (R-LEAD-01, rule 7)', () => {
  it.each([
    ['966598917071', '+966598917071'],
    ['201001234567', '+201001234567'],
    ['971501234567', '+971501234567'],
    ['447700900123', '+447700900123'],
    ['+966598917071', '+966598917071'],
  ])('%s → %s', (waId, e164) => {
    expect(waIdToE164(waId)).toBe(e164);
  });

  it.each(['', 'abc', '966', '96659891707', '2010012345'])('%j → null', (waId) => {
    expect(waIdToE164(waId)).toBeNull();
  });
});

describe('sessionWindowOpen (24 h customer-service window)', () => {
  const now = new Date('2026-10-02T12:00:00Z');

  it.each([
    ['1 minute ago', '2026-10-02T11:59:00Z', true],
    ['23:59 ago', '2026-10-01T12:01:00Z', true],
    ['exactly 24 h ago', '2026-10-01T12:00:00Z', false],
    ['25 h ago', '2026-10-01T11:00:00Z', false],
  ])('%s → %s', (_name, at, open) => {
    expect(sessionWindowOpen(at, now)).toBe(open);
    expect(sessionWindowOpen(new Date(at), now)).toBe(open);
  });

  it('no inbound message yet, or garbage → closed', () => {
    expect(sessionWindowOpen(null, now)).toBe(false);
    expect(sessionWindowOpen(undefined, now)).toBe(false);
    expect(sessionWindowOpen('not a date', now)).toBe(false);
    expect(SESSION_WINDOW_MS).toBe(86_400_000);
  });
});

describe('clickToChatLink (R-MSG-03)', () => {
  it('drops the + and encodes Arabic, new lines and &', () => {
    expect(clickToChatLink('+966598917071', 'حلقة سهيلة\nالساعة 5 & 6')).toBe(
      'https://wa.me/966598917071?text=%D8%AD%D9%84%D9%82%D8%A9%20%D8%B3%D9%87%D9%8A%D9%84%D8%A9%0A%D8%A7%D9%84%D8%B3%D8%A7%D8%B9%D8%A9%205%20%26%206',
    );
  });

  it('no text → the bare chat link', () => {
    expect(clickToChatLink('+201001234567')).toBe('https://wa.me/201001234567');
    expect(clickToChatLink('+201001234567', '')).toBe('https://wa.me/201001234567');
  });
});

describe('backoff and retry (R-MSG-02, rule 8)', () => {
  it.each([
    [1, 60_000],
    [2, 300_000],
    [3, 1_500_000],
    [4, 3_600_000],
    [10, 3_600_000],
    [0, 60_000],
    [-3, 60_000],
  ])('after %i failed tries wait %i ms', (attempt, ms) => {
    expect(backoff(attempt)).toBe(ms);
  });

  it('three tries per message', () => {
    expect(MAX_SEND_ATTEMPTS).toBe(3);
  });

  it.each([
    [null, true],
    [undefined, true],
    [130429, true],
    [131000, true],
    [131016, true],
    [133004, true],
    [132001, false],
    [132000, false],
    [131047, false],
    [131026, false],
    [100, false],
  ])('Meta error %j retryable → %s', (code, retry) => {
    expect(isRetryableWaError(code)).toBe(retry);
  });
});

describe('token / permission errors and the admin retry button', () => {
  it.each([
    [190, true],
    [10, true],
    [200, true],
    [131026, false],
    [null, false],
  ])('Meta error %j is an auth error → %s', (code, auth) => {
    expect(isWaAuthError(code)).toBe(auth);
  });

  it.each([
    ['131026', false],
    ['131047', false],
    ['expired', false],
    ['stale', false],
    ['handed_off', false],
    ['132001', true],
    ['uncertain', true],
    ['network', true],
    [null, true],
  ])('«جرّب تاني» for error %j → %s', (code, ok) => {
    expect(canRetryCode(code)).toBe(ok);
  });
});
