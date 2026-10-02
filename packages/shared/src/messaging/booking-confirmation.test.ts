import { describe, expect, it } from 'vitest';
import { bookingConfirmationTemplate, lessonWhenText } from './booking-confirmation.js';

describe('bookingConfirmationTemplate (R-SCH-06, R-LES-02)', () => {
  it('a Jitsi room → booking_confirmation with the slug as button param', () => {
    expect(bookingConfirmationTemplate('https://meet.jit.si/AyatAlbayan-Abrar')).toEqual({
      key: 'booking_confirmation',
      button: 'AyatAlbayan-Abrar',
    });
  });

  it('a Google Meet link → booking_confirmation_meet with the code (query ignored)', () => {
    expect(bookingConfirmationTemplate('https://meet.google.com/abc-defg-hij?authuser=0')).toEqual({
      key: 'booking_confirmation_meet',
      button: 'abc-defg-hij',
    });
  });

  it('ignores host case, spaces and a trailing slash', () => {
    expect(bookingConfirmationTemplate(' https://Meet.Google.com/abc-defg-hij/ ')).toEqual({
      key: 'booking_confirmation_meet',
      button: 'abc-defg-hij',
    });
  });

  it.each([
    null,
    undefined,
    '',
    'not a url',
    'https://us06web.zoom.us/j/123',
    'https://meet.google.com/',
  ])('%j → the plain template', (link) => {
    expect(bookingConfirmationTemplate(link)).toEqual({
      key: 'booking_confirmation_plain',
      button: null,
    });
  });
});

describe('lessonWhenText ({{2}}, R-SCH-01)', () => {
  const at = new Date('2026-10-04T14:00:00Z');

  it('shows the wall-clock in the given tz with Western digits, 24h', () => {
    expect(lessonWhenText(at, 'Asia/Riyadh')).toBe('الأحد 4 أكتوبر 17:00');
    expect(lessonWhenText(at, 'America/New_York')).toBe('الأحد 4 أكتوبر 10:00');
  });

  it('rolls to the next local day when the time crosses midnight', () => {
    expect(lessonWhenText(new Date('2026-10-04T22:30:00Z'), 'Asia/Riyadh')).toBe(
      'الاثنين 5 أكتوبر 01:30',
    );
  });
});
