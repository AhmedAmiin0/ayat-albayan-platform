import { describe, expect, it } from 'vitest';
import {
  availabilitySlotSchema,
  guardianCreateSchema,
  jobApplicantCreateSchema,
  leadCreateSchema,
  leadQualificationSchema,
  studentCreateSchema,
  timeOffCreateSchema,
} from './index.js';

const GUARDIAN = { name: 'ام ايمان', phone_e164: '0501234567', tz: 'Asia/Riyadh' };

describe('people schemas (R-STU-02, R-STU-05, rule 6)', () => {
  it('normalises the guardian phone to E.164', () => {
    expect(guardianCreateSchema.parse(GUARDIAN).phone_e164).toBe('+966501234567');
  });

  it('rejects a handle instead of a phone with the reason as message', () => {
    const r = guardianCreateSchema.safeParse({ ...GUARDIAN, phone_e164: '@ayat' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('not_a_number');
  });

  it('rejects an unknown time zone', () => {
    expect(guardianCreateSchema.safeParse({ ...GUARDIAN, tz: 'Riyadh' }).success).toBe(false);
  });

  it('defaults student program/status and has no typed code (R-STU-01)', () => {
    const s = studentCreateSchema.parse({
      guardian_id: '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11',
      name: 'سهيلة',
      tz: 'Africa/Cairo',
      code: 'AB-0001',
    });
    expect(s).toMatchObject({ program: 'quran', status: 'new' });
    expect(s).not.toHaveProperty('code');
  });
});

describe('availability schemas (R-TCH-02)', () => {
  const slot = { weekday: 6, start_time: '16:00', end_time: '18:30', tz: 'Africa/Cairo' };

  it('accepts a valid slot', () => {
    expect(availabilitySlotSchema.safeParse(slot).success).toBe(true);
  });

  it.each([
    { ...slot, weekday: 7 },
    { ...slot, start_time: '4pm' },
    { ...slot, end_time: '15:00' },
  ])('rejects %j', (bad) => {
    expect(availabilitySlotSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects time-off that ends before it starts', () => {
    const r = timeOffCreateSchema.safeParse({
      starts_at: '2026-10-05T10:00:00Z',
      ends_at: '2026-10-05T09:00:00Z',
    });
    expect(r.success).toBe(false);
  });
});

describe('lead + job applicant schemas (R-LEAD-01, R-LEAD-03, R-LEAD-04)', () => {
  it('defaults lead source/status/qualification', () => {
    expect(leadCreateSchema.parse({ phone_e164: '+201001234567' })).toMatchObject({
      phone_e164: '+201001234567',
      source: 'whatsapp_direct',
      status: 'new',
      qualification: {},
    });
  });

  it('keeps the first registration form questions (A9) and normalises the alternate phone', () => {
    const q = leadQualificationSchema.parse({
      city: 'جدة',
      filled_by: 'guardian',
      guardian_name: 'أم جود',
      guardian_relation: 'الأب',
      alt_phone: '0501234567',
      group_kind: 'group',
      notes: 'تفضّل معلمة',
    });
    expect(q).toMatchObject({ alt_phone: '+966501234567', filled_by: 'guardian', group_kind: 'group', notes: 'تفضّل معلمة' });
    expect(leadQualificationSchema.safeParse({ filled_by: 'teacher' }).success).toBe(false);
    expect(leadQualificationSchema.safeParse({ alt_phone: '12' }).success).toBe(false);
  });

  it('defaults job applicant status to new', () => {
    expect(jobApplicantCreateSchema.parse({ phone_e164: '01001234567' }).status).toBe('new');
  });
});
