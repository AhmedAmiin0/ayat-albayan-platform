import { lessonWhenText } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { confirmationMessages, forMessages } from './confirmation-messages';
import { CONTACT, GUARDIAN_ID } from '../lessons.fakes';

const LESSON = { id: 'l1', starts_at: '2026-10-04T14:00:00.000Z', meeting_link: 'https://meet.jit.si/abrar' };

describe('confirmationMessages — queued booking_confirmation* (docs/10 §5.11, R-LES-02)', () => {
  it('one jit message for one guardian: name, when in the guardian tz, room slug button, dedup', () => {
    expect(confirmationMessages(LESSON, [CONTACT])).toEqual([
      {
        phone_e164: '+966501234567',
        guardian_id: GUARDIAN_ID,
        lesson_id: 'l1',
        template_key: 'booking_confirmation',
        template_params: {
          '1': 'سهيلة',
          '2': lessonWhenText(new Date(LESSON.starts_at), 'Asia/Riyadh'),
          button: 'abrar',
        },
        dedup_key: `booking_confirmation:l1:${GUARDIAN_ID}`,
      },
    ]);
  });

  it('Google Meet link → _meet with the code; anything else → _plain without a button', () => {
    const meet = confirmationMessages({ ...LESSON, meeting_link: 'https://meet.google.com/abc-defg-hij' }, [CONTACT]);
    expect(meet[0]).toMatchObject({ template_key: 'booking_confirmation_meet', template_params: { button: 'abc-defg-hij' } });
    const plain = confirmationMessages({ ...LESSON, meeting_link: null }, [CONTACT]);
    expect(plain[0]?.template_key).toBe('booking_confirmation_plain');
    expect(plain[0]?.template_params).not.toHaveProperty('button');
  });

  it('siblings under one guardian share one message; two guardians get one each', () => {
    const sister = { ...CONTACT, id: 's2', name: 'مريم' };
    const other = { id: 's3', name: 'علي', guardian: { id: 'g2', phone_e164: '+201001234567', tz: 'Africa/Cairo' } };
    const out = confirmationMessages(LESSON, [CONTACT, sister, other]);
    expect(out).toHaveLength(2);
    expect(out[0]?.template_params['1']).toBe('سهيلة ومريم');
    expect(out[1]).toMatchObject({ guardian_id: 'g2', dedup_key: 'booking_confirmation:l1:g2' });
    expect(out[1]?.template_params['2']).toBe(lessonWhenText(new Date(LESSON.starts_at), 'Africa/Cairo'));
  });

  it('forMessages: settings.meeting_link_auto ON names no link (plain); OFF leaves the lesson as it is', () => {
    expect(forMessages(LESSON, false)).toBe(LESSON);
    const auto = forMessages(LESSON, true);
    expect(auto).toEqual({ ...LESSON, meeting_link: null });
    expect(LESSON.meeting_link).toBe('https://meet.jit.si/abrar');
    expect(confirmationMessages(auto, [CONTACT])[0]?.template_key).toBe('booking_confirmation_plain');
  });

  it('a student without a guardian row queues nothing', () => {
    expect(confirmationMessages(LESSON, [{ ...CONTACT, guardian: null }])).toEqual([]);
  });
});
