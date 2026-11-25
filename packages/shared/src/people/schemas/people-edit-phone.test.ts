import { describe, expect, it } from 'vitest';
import { PEOPLE_EDIT_ERRORS, peopleStudentPatchSchema } from './people-edit';
import { peopleEditStudentSchema } from './people-edit-view';

// A student's own WhatsApp number (optional, E.164), entered by staff.

describe("peopleStudentPatchSchema: the student's own number", () => {
  it('normalizes a typed number to E.164', () => {
    const r = peopleStudentPatchSchema.safeParse({ phone_e164: '00966 50 000 0007' });
    expect(r.success && r.data.phone_e164).toBe('+966500000007');
  });

  it('null removes it; leaving it out changes nothing', () => {
    expect(peopleStudentPatchSchema.parse({ phone_e164: null })).toEqual({ phone_e164: null });
    expect(peopleStudentPatchSchema.parse({ name: 'سهيلة' })).toEqual({ name: 'سهيلة' });
  });

  it('refuses a number that is not a phone, and stays strict', () => {
    expect(peopleStudentPatchSchema.safeParse({ phone_e164: 'abc' }).success).toBe(false);
    expect(peopleStudentPatchSchema.safeParse({ status: 'active' }).success).toBe(false);
  });

  it('names the two new refusals', () => {
    expect(PEOPLE_EDIT_ERRORS).toEqual(
      expect.arrayContaining(['teacher_number', 'student_login_phone']),
    );
  });
});

describe('peopleEditStudentSchema', () => {
  const student = {
    id: 's1',
    code: 'AB-0183',
    name: 'سهيلة',
    age: 12,
    gender: 'female',
    level: null,
    memorized: null,
    goal: null,
    riwaya: null,
    tz: 'Africa/Cairo',
    teacher_gender_pref: null,
    contact_is_self: false,
    has_login: false,
    has_records: false,
  };

  it("carries the student's own number, null for none", () => {
    expect(peopleEditStudentSchema.parse({ ...student, phone_e164: null }).phone_e164).toBeNull();
    const own = peopleEditStudentSchema.parse({ ...student, phone_e164: '+966500000007' });
    expect(own.phone_e164).toBe('+966500000007');
  });

  it('requires the key', () => {
    expect(peopleEditStudentSchema.safeParse(student).success).toBe(false);
  });
});
