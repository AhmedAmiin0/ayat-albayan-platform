import { describe, expect, it } from 'vitest';
import {
  followUpSlotsMessage,
  lessonReminder24hMessage,
  lessonReminderMessage,
  teacherReminderMessage,
} from './params.js';

const LESSON = 'b1c2d3e4-0000-4000-8000-000000000001';
// 14:00 UTC = 17:00 Riyadh = 17:00 Cairo (EEST, UTC+3 until 30 Oct 2026) = 10:00 New York.
const startsAt = new Date('2026-10-04T14:00:00Z');
const base = { names: ['سهيلة', 'مريم'], startsAt, tz: 'Asia/Riyadh' };

describe('lessonReminderMessage (same day, R-MSG-02)', () => {
  it('Jitsi link → lesson_reminder with the room slug; {{2}} is the guardian-local time', () => {
    expect(lessonReminderMessage({ ...base, meetingLink: 'https://meet.jit.si/AyatAlbayan-Abrar' })).toEqual({
      key: 'lesson_reminder',
      params: { '1': 'سهيلة ومريم', '2': '17:00', button: 'AyatAlbayan-Abrar' },
    });
  });

  it('Meet link → _meet; no link → _plain without a button', () => {
    expect(lessonReminderMessage({ ...base, meetingLink: 'https://meet.google.com/abc-defg-hij' })).toMatchObject({
      key: 'lesson_reminder_meet',
      params: { button: 'abc-defg-hij' },
    });
    const plain = lessonReminderMessage({ ...base, meetingLink: null });
    expect(plain.key).toBe('lesson_reminder_plain');
    expect(plain.params).not.toHaveProperty('button');
  });

  it('wall-clock follows the guardian tz (New York sees 10:00)', () => {
    expect(lessonReminderMessage({ ...base, tz: 'America/New_York' }).params['2']).toBe('10:00');
  });
});

describe('lessonReminder24hMessage (R-SCH-03 confirm by reply)', () => {
  it('quick replies carry confirm / reschedule with the lesson id', () => {
    expect(lessonReminder24hMessage({ ...base, names: ['سهيلة'], lessonId: LESSON })).toEqual({
      key: 'lesson_reminder_24h',
      params: { '1': 'سهيلة', '2': '17:00', payloads: [`confirm:${LESSON}`, `reschedule:${LESSON}`] },
    });
  });
});

describe('teacherReminderMessage', () => {
  it('{{1}} teacher, {{2}} «time — names» in the teacher tz; Meet → _meet', () => {
    const msg = teacherReminderMessage({
      ...base,
      tz: 'Africa/Cairo',
      teacherName: 'أبرار',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
    });
    expect(msg).toEqual({
      key: 'teacher_lesson_reminder_meet',
      params: { '1': 'أبرار', '2': '17:00 — سهيلة ومريم', button: 'abc-defg-hij' },
    });
  });

  it('Jitsi has no teacher variant → the plain template, the link in {{2}} as in the approved sample', () => {
    const link = 'https://meet.jit.si/AyatAlBayan-1cd3400cedd7';
    const msg = teacherReminderMessage({ ...base, teacherName: 'أبرار', meetingLink: link });
    expect(msg).toEqual({
      key: 'teacher_lesson_reminder',
      params: { '1': 'أبرار', '2': `17:00 — سهيلة ومريم · رابط الحلقة: ${link}` },
    });
  });

  it('any other link rides in {{2}} too; no link → time and names only', () => {
    const zoom = teacherReminderMessage({ ...base, teacherName: 'أبرار', meetingLink: 'https://us06web.zoom.us/j/123' });
    expect(zoom.params['2']).toBe('17:00 — سهيلة ومريم · رابط الحلقة: https://us06web.zoom.us/j/123');
    for (const meetingLink of [null, undefined, '   ']) {
      expect(teacherReminderMessage({ ...base, teacherName: 'أبرار', meetingLink }).params['2']).toBe('17:00 — سهيلة ومريم');
    }
  });

  it('{{2}} stays one line: Meta refuses newlines, tabs and 4+ spaces in a parameter', () => {
    const msg = teacherReminderMessage({
      ...base,
      names: ['سهيلة\n', 'مريم'],
      teacherName: 'أبرار',
      meetingLink: ' https://meet.jit.si/x\t\n',
    });
    expect(msg.params['2']).toBe('17:00 — سهيلة ومريم · رابط الحلقة: https://meet.jit.si/x');
    expect(msg.params['2']).not.toMatch(/[\n\t]| {4}/);
  });
});

describe('followUpSlotsMessage (R-LEAD-05)', () => {
  it('two slots in the lead tz, the city, and stop:<lead>', () => {
    const msg = followUpSlotsMessage({
      slots: [startsAt, new Date('2026-10-05T17:30:00Z')],
      tz: 'Asia/Riyadh',
      tzCity: 'الرياض',
      leadId: 'lead-1',
    });
    expect(msg).toEqual({
      key: 'follow_up_slots',
      params: {
        '1': 'الأحد 4 أكتوبر 17:00',
        '2': 'الاثنين 5 أكتوبر 20:30',
        '3': 'الرياض',
        payloads: ['stop:lead-1'],
      },
    });
  });
});
