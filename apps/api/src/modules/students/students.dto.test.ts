import { describe, expect, it } from 'vitest';
import { studentCreateRequestSchema, studentPatchSchema } from './students.dto';

const GUARDIAN = { name: 'ام جود', phone_e164: '0501234567', tz: 'Asia/Riyadh' };

describe('students DTOs', () => {
  it('PATCH with one field does not reset status/program to their defaults (R-STU-05)', () => {
    expect(studentPatchSchema.parse({ level: 'جزء عم' })).toEqual({ level: 'جزء عم' });
  });

  it('PATCH still validates enums, links and time zones', () => {
    expect(studentPatchSchema.safeParse({ status: 'gone' }).success).toBe(false);
    expect(studentPatchSchema.safeParse({ meeting_link_override: 'zoom' }).success).toBe(false);
    expect(studentPatchSchema.safeParse({ tz: 'Mars/Base' }).success).toBe(false);
  });

  it('create needs exactly one of guardian_id / guardian (R-STU-04)', () => {
    const base = { name: 'سهيلة', tz: 'Asia/Riyadh' };
    expect(studentCreateRequestSchema.safeParse(base).success).toBe(false);
    const both = { ...base, guardian: GUARDIAN, guardian_id: '11111111-1111-4111-8111-111111111111' };
    expect(studentCreateRequestSchema.safeParse(both).success).toBe(false);
  });

  it('create normalises the guardian phone and defaults status/program/force (R-STU-02)', () => {
    const dto = studentCreateRequestSchema.parse({ name: 'سهيلة', tz: 'Asia/Riyadh', guardian: GUARDIAN });
    expect(dto.guardian?.phone_e164).toBe('+966501234567');
    expect(dto).toMatchObject({ status: 'trial', program: 'quran', force: false });
  });
});
