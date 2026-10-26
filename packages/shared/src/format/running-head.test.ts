import { describe, expect, it } from 'vitest';
import { clockTime, formatRunningHead } from './running-head.js';

describe('formatRunningHead (docs/07 §7)', () => {
  it('formats the reference date: Gregorian, Hijri (Umm al-Qura), both clocks', () => {
    expect(formatRunningHead(new Date('2026-10-01T12:20:00Z'))).toEqual({
      gregorian: 'الخميس 1 أكتوبر 2026',
      hijri: '20 ربيع الآخر 1448 هـ',
      riyadhTime: '15:20',
      cairoTime: '15:20', // Egypt DST (UTC+3) until the last Thursday of October
    });
  });

  it('Cairo falls back an hour after Egypt DST ends (30 Oct 2026)', () => {
    const head = formatRunningHead(new Date('2026-12-01T12:20:00Z'));
    expect(head.riyadhTime).toBe('15:20');
    expect(head.cairoTime).toBe('14:20');
  });

  it('Cairo DST starts on the last Friday of April', () => {
    expect(clockTime(new Date('2026-04-23T09:00:00Z'), 'Africa/Cairo')).toBe('11:00');
    expect(clockTime(new Date('2026-04-25T09:00:00Z'), 'Africa/Cairo')).toBe('12:00');
  });

  it('uses the Riyadh calendar day and 24h clocks around midnight', () => {
    const head = formatRunningHead(new Date('2026-10-01T21:30:00Z'));
    expect(head.gregorian).toBe('الجمعة 2 أكتوبر 2026');
    expect(head.riyadhTime).toBe('00:30');
    expect(head.cairoTime).toBe('00:30');
  });

  it('speaks English for the English UI, same clocks', () => {
    expect(formatRunningHead(new Date('2026-10-01T12:20:00Z'), 'en')).toEqual({
      gregorian: 'Thursday 1 October 2026',
      hijri: '20 Rabiʻ II 1448 AH',
      riyadhTime: '15:20',
      cairoTime: '15:20',
    });
  });

  it('never emits Eastern-Arabic digits', () => {
    const all = Object.values(formatRunningHead(new Date('2027-03-15T05:05:00Z'))).join(' ');
    expect(all).not.toMatch(/[٠-٩۰-۹]/);
  });
});
