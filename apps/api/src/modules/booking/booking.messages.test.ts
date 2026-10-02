import { describe, expect, it } from 'vitest';
import { confirmationDrafts, type BookedStudent } from './booking.messages';

const firstStart = new Date('2026-10-04T14:00:00Z'); // Sun 17:00 Riyadh / 17:00 Cairo (UTC+3)
const riyadh = { id: 'G1', phone_e164: '+966552147730', tz: 'Asia/Riyadh' };
const cairo = { id: 'G2', phone_e164: '+201001234567', tz: 'Africa/Cairo' };
const one: BookedStudent[] = [{ name: 'سهيلة', guardian: riyadh }];

describe('confirmationDrafts — template by link (R-SCH-06, R-LES-02, docs/10 §5.11)', () => {
  it('Google Meet → booking_confirmation_meet with the meet code as the button', () => {
    const [draft] = confirmationDrafts({
      students: one,
      firstStart,
      meetingLink: 'https://meet.google.com/abc-defg-hij',
    });
    expect(draft).toEqual({
      guardian_id: 'G1',
      phone_e164: '+966552147730',
      template_key: 'booking_confirmation_meet',
      template_params: { '1': 'سهيلة', '2': 'الأحد 4 أكتوبر 17:00', button: 'abc-defg-hij' },
    });
  });

  it('Jitsi → booking_confirmation with the room slug', () => {
    const [draft] = confirmationDrafts({ students: one, firstStart, meetingLink: 'https://meet.jit.si/ab-abrar' });
    expect(draft).toMatchObject({ template_key: 'booking_confirmation', template_params: { button: 'ab-abrar' } });
  });

  it('no link → booking_confirmation_plain without a button param', () => {
    const [draft] = confirmationDrafts({ students: one, firstStart, meetingLink: null });
    expect(draft?.template_key).toBe('booking_confirmation_plain');
    expect(draft?.template_params).toEqual({ '1': 'سهيلة', '2': 'الأحد 4 أكتوبر 17:00' });
  });
});

describe('confirmationDrafts — one per guardian', () => {
  it('siblings share one message naming both children', () => {
    const students = [
      { name: 'سهيلة', guardian: riyadh },
      { name: 'مريم', guardian: riyadh },
    ];
    const drafts = confirmationDrafts({ students, firstStart, meetingLink: null });
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.template_params['1']).toBe('سهيلة و مريم');
  });

  it("two guardians → two messages, each in that guardian's own time zone", () => {
    const later = new Date('2026-11-01T14:00:00Z'); // after Cairo leaves DST: 16:00 Cairo, 17:00 Riyadh
    const students = [
      { name: 'سهيلة', guardian: riyadh },
      { name: 'يوسف', guardian: cairo },
    ];
    const drafts = confirmationDrafts({ students, firstStart: later, meetingLink: null });
    expect(drafts.map((d) => [d.guardian_id, d.template_params['2']])).toEqual([
      ['G1', 'الأحد 1 نوفمبر 17:00'],
      ['G2', 'الأحد 1 نوفمبر 16:00'],
    ]);
  });

  it('keeps a null guardian id for the guardian the RPC creates (lead path)', () => {
    const students = [{ name: 'سهيلة', guardian: { ...riyadh, id: null } }];
    expect(confirmationDrafts({ students, firstStart, meetingLink: null })[0]?.guardian_id).toBeNull();
  });
});
