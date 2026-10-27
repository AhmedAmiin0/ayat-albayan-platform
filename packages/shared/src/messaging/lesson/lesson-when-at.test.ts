import { describe, expect, it } from 'vitest';
import { lessonWhenAt, lessonWhenText } from './booking-confirmation.js';

const at = new Date('2026-10-04T14:00:00Z'); // 17:00 in Riyadh

describe('lessonWhenAt (screens, 12 or 24 h)', () => {
  it('24 h reads exactly like the WhatsApp text', () => {
    expect(lessonWhenAt(at, { tz: 'Asia/Riyadh', locale: 'ar', cycle: '24' })).toBe(lessonWhenText(at, 'Asia/Riyadh'));
  });

  it('12 h in Arabic and English', () => {
    expect(lessonWhenAt(at, { tz: 'Asia/Riyadh', locale: 'ar', cycle: '12' })).toBe('الأحد 4 أكتوبر 5:00 م');
    expect(lessonWhenAt(at, { tz: 'Asia/Riyadh', locale: 'en', cycle: '12' })).toBe('Sunday 4 October 5:00 PM');
  });
});
