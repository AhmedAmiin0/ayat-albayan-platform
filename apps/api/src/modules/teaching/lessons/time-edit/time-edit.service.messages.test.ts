import { lessonWhenText } from '@ab/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTACT, GUARDIAN_ID, STUDENT_ID } from '../lessons.fakes';
import { body, correction, heldRow, lessonRow, NOW, retimed, timeSetup } from './time-edit.fakes';
import { timeEditMessages } from './time-edit.messages';

const NEW_START = '2026-10-05T14:00:00.000Z';

describe('«عدّل الوقت» guardian notice (admin action, R-MSG-01 booking_confirmation)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('a move queues the booking_confirmation for the NEW start in the guardian tz; the key carries that start', async () => {
    const { run, writer } = timeSetup();
    const res = await run(body());
    expect(res.notified).toBe(1);
    expect(retimed(writer).messages).toEqual([
      {
        phone_e164: '+966501234567',
        guardian_id: GUARDIAN_ID,
        lesson_id: expect.any(String),
        template_key: 'booking_confirmation',
        template_params: { '1': 'سهيلة', '2': lessonWhenText(new Date(NEW_START), 'Asia/Riyadh'), button: 'abrar' },
        dedup_key: `booking_confirmation:${retimed(writer).lesson_id}:${GUARDIAN_ID}:${Date.parse(NEW_START)}`,
      },
    ]);
  });

  it('it is queued even with auto_messages_enabled off: the service never reads that setting for a move', async () => {
    const { run, writer, settings } = timeSetup();
    await run(body());
    expect(settings.all).not.toHaveBeenCalled();
    expect(retimed(writer).messages).toHaveLength(1);
  });

  it("the lesson's teacher holds it in our classroom: the notice names no fixed link (plain); the lesson keeps it", async () => {
    const { run, writer, queries } = timeSetup();
    queries.meetingLinkAuto.mockResolvedValue(true);
    await run(body());
    expect(queries.meetingLinkAuto).toHaveBeenCalledWith({ teacherId: lessonRow().teacher_id });
    expect(retimed(writer).messages[0]).toMatchObject({ template_key: 'booking_confirmation_plain' });
    expect(retimed(writer).messages[0]?.template_params).not.toHaveProperty('button');
  });

  it('notify: false queues nothing and does not even load the contacts', async () => {
    const { run, writer, queries } = timeSetup();
    await run(body({ notify: false }));
    expect(retimed(writer).messages).toEqual([]);
    expect(queries.contacts).not.toHaveBeenCalled();
  });

  it('a duration-only change sends nothing: the template only shows names and the start', async () => {
    const { run, writer } = timeSetup();
    await run(body({ startsAt: '2026-10-04T14:00:00.000Z', durationMin: 60 }));
    expect(retimed(writer).messages).toEqual([]);
  });

  it('a held lesson is never announced, whatever the flag says', async () => {
    const { run, writer } = timeSetup(heldRow());
    await run(correction({ notify: true }));
    expect(retimed(writer).messages).toEqual([]);
  });

  it('a student without a guardian has no one to tell; a group of two guardians gets two notices', async () => {
    const lonely = timeSetup();
    lonely.queries.contacts.mockResolvedValue([{ id: STUDENT_ID, name: 'سهيلة', guardian: null }]);
    expect((await lonely.run(body())).notified).toBe(0);
    const group = timeSetup(lessonRow());
    group.queries.contacts.mockResolvedValue([CONTACT, { id: 's2', name: 'مريم', guardian: { id: 'g2', phone_e164: '+201001234567', tz: 'Africa/Cairo' } }]);
    expect((await group.run(body())).notified).toBe(2);
  });

  it('timeEditMessages: the same template as a booking, one per guardian, a different key per start', () => {
    const a = timeEditMessages({ id: 'L', starts_at: NEW_START, meeting_link: null }, [CONTACT]);
    const b = timeEditMessages({ id: 'L', starts_at: '2026-10-06T14:00:00.000Z', meeting_link: null }, [CONTACT]);
    expect(a[0]?.template_key).toBe('booking_confirmation_plain');
    expect(a[0]?.dedup_key).not.toBe(b[0]?.dedup_key);
    expect(timeEditMessages({ id: 'L', starts_at: NEW_START, meeting_link: null }, [CONTACT])[0]?.dedup_key).toBe(a[0]?.dedup_key);
  });
});
