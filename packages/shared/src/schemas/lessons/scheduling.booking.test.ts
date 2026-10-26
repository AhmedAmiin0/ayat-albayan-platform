import { describe, expect, it } from 'vitest';
import { bookingRequestSchema } from './scheduling.js';

const T = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const S1 = '0b7c6a52-6a7e-4b38-9a3f-1c2d3e4f5a61';
const S2 = '0b7c6a52-6a7e-4b38-9a3f-1c2d3e4f5a62';
const LEAD = '9d8e7f60-1a2b-4c3d-8e9f-0a1b2c3d4e5f';
const RULE = {
  teacherId: T,
  byday: [0, 2],
  startTimeLocal: '17:00',
  tz: 'Asia/Riyadh',
  durationMin: 45,
  startsOn: '2026-10-04',
  package: '8',
};
const NEW_STUDENT = { name: 'سهيلة', tz: 'Asia/Riyadh' };
const GUARDIAN = { name: 'ام سهيلة', phone_e164: '0501234567', tz: 'Asia/Riyadh' };

describe('BookingRequest: existing students (R-SCH-06, R-STU-04)', () => {
  it('accepts a group booking', () => {
    const r = bookingRequestSchema.parse({ ...RULE, studentIds: [S1, S2] });
    expect(r).toMatchObject({ studentIds: [S1, S2], durationMin: 45, package: '8' });
  });

  it('accepts an admin override with a reason (R-SCH-04)', () => {
    const r = bookingRequestSchema.parse({
      ...RULE,
      studentIds: [S1],
      override: { reason: 'طلب ولي الأمر' },
    });
    expect(r.override?.reason).toBe('طلب ولي الأمر');
  });

  it.each([
    ['no students', { studentIds: [] }],
    ['a repeated student', { studentIds: [S1, S1] }],
    ['a repeated day', { studentIds: [S1], byday: [0, 0] }],
    ['no day', { studentIds: [S1], byday: [] }],
    ['day 7', { studentIds: [S1], byday: [7] }],
    ['free-text time (rule 6)', { studentIds: [S1], startTimeLocal: '5 العصر' }],
    ['12h time', { studentIds: [S1], startTimeLocal: '5:00 PM' }],
    ['an unknown tz', { studentIds: [S1], tz: 'Riyadh' }],
    ['a 50-minute lesson', { studentIds: [S1], durationMin: 50 }],
    ['an unknown package', { studentIds: [S1], package: '10' }],
    ['a datetime as startsOn', { studentIds: [S1], startsOn: '2026-10-04T10:00:00Z' }],
    ['an empty override reason', { studentIds: [S1], override: { reason: '  ' } }],
  ])('rejects %s', (_name, patch) => {
    expect(bookingRequestSchema.safeParse({ ...RULE, ...patch }).success).toBe(false);
  });
});

describe('BookingRequest: lead conversion (R-LEAD-06)', () => {
  it('accepts lead + new student + guardian and normalises the phone', () => {
    const r = bookingRequestSchema.parse({
      ...RULE,
      package: 'trial',
      leadId: LEAD,
      newStudent: NEW_STUDENT,
      guardian: GUARDIAN,
    });
    expect('guardian' in r && r.guardian.phone_e164).toBe('+966501234567');
    expect('newStudent' in r && r.newStudent.status).toBe('new');
  });

  it('rejects a lead without the new student', () => {
    expect(
      bookingRequestSchema.safeParse({ ...RULE, leadId: LEAD, guardian: GUARDIAN }).success,
    ).toBe(false);
  });

  it('rejects both shapes at once', () => {
    const both = {
      ...RULE,
      studentIds: [S1],
      leadId: LEAD,
      newStudent: NEW_STUDENT,
      guardian: GUARDIAN,
    };
    expect(bookingRequestSchema.safeParse(both).success).toBe(false);
  });

  it('rejects neither shape', () => {
    expect(bookingRequestSchema.safeParse(RULE).success).toBe(false);
  });
});
