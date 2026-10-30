import { describe, expect, it } from 'vitest';
import { bookingRequestSchema } from '../../schedule/schemas/scheduling.js';
import { studentCreateSchema, studentUpdateSchema } from './people.js';

// «رقم الواتساب لـ: ولي الأمر / الطالب نفسه» (docs/30 §1): optional everywhere a student is described.

const G = '0b7c6a52-6a7e-4b38-9a3f-1c2d3e4f5a61';
const T = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const STUDENT = { guardian_id: G, name: 'سهيلة', tz: 'Asia/Riyadh' };

describe('contact_is_self', () => {
  it('studentCreateSchema accepts it and omits it when absent', () => {
    expect(studentCreateSchema.parse({ ...STUDENT, contact_is_self: true }).contact_is_self).toBe(true);
    expect(studentCreateSchema.parse(STUDENT)).not.toHaveProperty('contact_is_self');
  });

  it('studentUpdateSchema accepts a boolean only', () => {
    expect(studentUpdateSchema.parse({ contact_is_self: false }).contact_is_self).toBe(false);
    expect(studentUpdateSchema.safeParse({ contact_is_self: 'self' }).success).toBe(false);
  });

  it("the booking request's newStudent carries it", () => {
    const r = bookingRequestSchema.parse({
      teacherId: T,
      byday: [0, 2],
      startTimeLocal: '17:00',
      tz: 'Asia/Riyadh',
      durationMin: 45,
      startsOn: '2026-10-04',
      package: 'trial',
      leadId: '9d8e7f60-1a2b-4c3d-8e9f-0a1b2c3d4e5f',
      guardian: { name: 'سهيلة', phone_e164: '0501234567', tz: 'Asia/Riyadh' },
      newStudent: { name: 'سهيلة', tz: 'Asia/Riyadh', contact_is_self: true },
    });
    expect('newStudent' in r && r.newStudent.contact_is_self).toBe(true);
  });
});
