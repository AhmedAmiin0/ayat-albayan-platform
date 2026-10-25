import { describe, expect, it } from 'vitest';
import { confirmationDrafts, type BookedStudent } from './booking.messages';

const riyadh = { id: 'G1', phone_e164: '+966552147730', tz: 'Asia/Riyadh' };
const cairo = { id: 'G2', phone_e164: '+201001234567', tz: 'Africa/Cairo' };
const first = new Date('2026-10-04T14:00:00Z');
const draft = (students: BookedStudent[], kind?: 'makeup' | 'package' | 'trial') =>
  confirmationDrafts({ students, firstStart: first, meetingLink: 'https://meet.jit.si/ab-abrar', ...(kind ? { kind } : {}) });

describe('confirmationDrafts — a makeup (R-SCH-10)', () => {
  it('reuses the approved booking_confirmation* template; {{1}} = «تعويضية لـ{name}»', () => {
    const [m] = draft([{ name: 'سهيلة', guardian: riyadh }], 'makeup');
    expect(m).toMatchObject({
      template_key: 'booking_confirmation',
      template_params: { '1': 'تعويضية لـسهيلة', '2': 'الأحد 4 أكتوبر 17:00' },
    });
  });

  it('keeps the guardian\'s own time zone in {{2}} (Cairo is UTC+2 in winter)', () => {
    const [m] = confirmationDrafts({
      students: [{ name: 'يوسف', guardian: cairo }],
      firstStart: new Date('2026-12-06T14:00:00Z'),
      meetingLink: null,
      kind: 'makeup',
    });
    expect(m?.template_params['2']).toBe('الأحد 6 ديسمبر 16:00');
  });

  it('the link-less template follows the lesson\'s link, as for any booking', () => {
    const [m] = confirmationDrafts({
      students: [{ name: 'سهيلة', guardian: riyadh }],
      firstStart: first,
      meetingLink: null,
      kind: 'makeup',
    });
    expect(m?.template_key).toBe('booking_confirmation_plain');
  });

  it.each([undefined, 'package', 'trial'] as const)('kind %s keeps the plain name', (kind) => {
    const [m] = draft([{ name: 'سهيلة', guardian: riyadh }], kind);
    expect(m?.template_params['1']).toBe('سهيلة');
  });
});
