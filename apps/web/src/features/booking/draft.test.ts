import { bookingRequestSchema, type BookingTeacherOption } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { emptyDraft, ruleFromSlot, stepReady, toBookingRequest, type BookingDraft } from './draft';

const TEACHER: BookingTeacherOption = {
  id: '6f1c2a3e-1b2c-4d5e-8f90-123456789abc',
  display_name_ar: 'أبرار',
  gender: 'female',
  programs: ['quran'],
  tz: 'Africa/Cairo',
  meeting_link: null,
  platform_classroom: false,
  students_count: 3,
  max_students: 10,
  has_availability: true,
};
const STUDENT = { id: '0b5e7d1a-2c3d-4e5f-9a8b-7c6d5e4f3a2b', name: 'سهيلة', code: 'AB-0183' };
// 17:00 Sunday 4 Oct in Riyadh = 16:00 Sunday in Cairo (winter) … here October, Cairo is UTC+3 too.
const SLOT = '2026-10-04T14:00:00.000Z';

const ready = (o: Partial<BookingDraft> = {}): BookingDraft => ({
  ...emptyDraft(),
  students: [STUDENT],
  tz: 'Asia/Riyadh',
  teacher: TEACHER,
  startsAt: SLOT,
  ...o,
});

describe('ruleFromSlot (R-SCH-06)', () => {
  it('reads the local start day and time in the family zone', () => {
    expect(ruleFromSlot(SLOT, 'Asia/Riyadh')).toEqual({ startsOn: '2026-10-04', startTimeLocal: '17:00', weekday: 0 });
    expect(ruleFromSlot('2026-10-03T22:00:00Z', 'America/New_York')).toEqual({
      startsOn: '2026-10-03',
      startTimeLocal: '18:00',
      weekday: 6,
    });
  });
});

describe('stepReady', () => {
  it('needs a student, a teacher with availability, and a slot', () => {
    expect(stepReady(emptyDraft(), 'students')).toBe(false);
    expect(stepReady(ready(), 'students')).toBe(true);
    expect(stepReady(ready({ teacher: { ...TEACHER, has_availability: false } }), 'teacher')).toBe(false);
    expect(stepReady(ready(), 'teacher')).toBe(true);
    expect(stepReady(ready({ startsAt: null }), 'slot')).toBe(false);
    expect(stepReady(ready(), 'package')).toBe(true);
  });

  it('the lead path needs the new student, the guardian name and phone', () => {
    const lead = emptyDraft({ leadId: 'l1', trial: true });
    expect(lead.pkg).toBe('trial');
    expect(stepReady({ ...lead, newStudent: { name: 'جود', guardianName: '', guardianPhone: '0501234567' } }, 'students')).toBe(false);
    expect(stepReady({ ...lead, newStudent: { name: 'جود', guardianName: 'أم جود', guardianPhone: '0501234567' } }, 'students')).toBe(true);
  });
});

describe('toBookingRequest (POST /booking)', () => {
  it('builds a valid existing-students request with the override reason', () => {
    // Tuesday 6 Oct 17:00 Riyadh: the same time, so no dayTimes.
    const body = toBookingRequest(ready({ extra: ['2026-10-06T14:00:00.000Z'], meetingLink: ' ' }), 'طلب ولي الأمر');
    expect(body).toMatchObject({
      studentIds: [STUDENT.id],
      teacherId: TEACHER.id,
      byday: [0, 2],
      startTimeLocal: '17:00',
      tz: 'Asia/Riyadh',
      durationMin: 45,
      startsOn: '2026-10-04',
      package: '8',
      meetingLink: null,
      override: { reason: 'طلب ولي الأمر' },
    });
    expect(body).not.toHaveProperty('dayTimes');
    expect(bookingRequestSchema.safeParse(body).success).toBe(true);
  });

  it('builds a valid lead request: new student + guardian, the trial package', () => {
    const lead: BookingDraft = {
      ...ready({ students: [], kind: 'trial', pkg: 'trial', genderPref: 'female', country: 'SA' }),
      leadId: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
      newStudent: { name: ' جود ', guardianName: 'أم جود', guardianPhone: '+966 50 123 4567' },
    };
    const body = toBookingRequest(lead);
    expect(body).toMatchObject({
      leadId: lead.leadId,
      newStudent: { name: 'جود', program: 'quran', tz: 'Asia/Riyadh', status: 'trial', teacher_gender_pref: 'female' },
      guardian: { name: 'أم جود', tz: 'Asia/Riyadh', country: 'SA' },
      byday: [0],
    });
    expect(body).not.toHaveProperty('studentIds');
    expect(bookingRequestSchema.safeParse(body).success).toBe(true);
    // «اشترك» from the chat: a regular package books a «new» student; a payment makes it active.
    expect(toBookingRequest({ ...lead, kind: 'package', pkg: '8' })).toMatchObject({ package: '8', newStudent: { status: 'new' } });
  });

  it('carries the idempotency key, the picked instant, and force on the lead path', () => {
    const d = ready({});
    const body = toBookingRequest(d);
    expect(body).toMatchObject({ clientRequestId: d.requestId, startsAt: d.startsAt });
    expect(toBookingRequest(d)?.clientRequestId).toBe(body?.clientRequestId);
    const lead: BookingDraft = {
      ...ready({ students: [], kind: 'trial', pkg: 'trial', force: true }),
      leadId: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
      newStudent: { name: 'جود', guardianName: 'أم جود', guardianPhone: '0501234567' },
    };
    expect(toBookingRequest(lead)).toMatchObject({ force: true });
    expect(emptyDraft().requestId).not.toBe(emptyDraft().requestId);
  });

  it('is null until a teacher and a slot are picked', () => {
    expect(toBookingRequest(ready({ teacher: null }))).toBeNull();
    expect(toBookingRequest(ready({ startsAt: null }))).toBeNull();
    expect(toBookingRequest({ ...ready({ students: [] }), leadId: null })).toBeNull();
  });
});
