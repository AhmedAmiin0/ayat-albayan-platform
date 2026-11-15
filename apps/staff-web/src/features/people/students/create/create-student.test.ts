import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { duplicateCandidates } from '@/features/people/students/api';
import { ageError, EMPTY_STUDENT, parseAge, phoneError, requiredError, toCreateBody } from './create-student';

describe('create student helpers (R-STU-02, R-STU-03)', () => {
  it('phoneError: accepts any Saudi/Egyptian format, explains rejects in Arabic', () => {
    expect(phoneError('0501234567')).toBeUndefined();
    expect(phoneError('+966 50 123 4567')).toBeUndefined();
    expect(phoneError('@suhaila')).toBe(t.common.phoneErrors.not_a_number);
    expect(phoneError('12345')).toBe(t.common.phoneErrors.missing_country_code);
    expect(phoneError('')).toBe(t.common.phoneErrors.empty);
  });

  it('requiredError: blank or spaces-only is «هذه الخانة مطلوبة»', () => {
    expect(requiredError('')).toBe(t.common.required);
    expect(requiredError('   ')).toBe(t.common.required);
    expect(requiredError('سهيلة')).toBeUndefined();
  });

  it('toCreateBody: one tz for student and guardian, trimmed names, force flag', () => {
    const v = { ...EMPTY_STUDENT, guardianPhone: '0501234567', guardianName: ' ام جود ', name: ' سهيلة ' };
    expect(toCreateBody(v, true)).toEqual({
      name: 'سهيلة',
      age: null,
      gender: null,
      tz: 'Asia/Riyadh',
      program: 'quran',
      guardian: { name: 'ام جود', phone_e164: '0501234567', tz: 'Asia/Riyadh', source: null },
      force: true,
    });
  });

  it('toCreateBody: the form’s «عمر الطالب», «النوع» and «كيف عرفت عنا؟» (research-forms 1, 3)', () => {
    const v = { ...EMPTY_STUDENT, name: 'جود', age: ' 9 ', gender: 'female', source: 'referral' } as const;
    expect(toCreateBody(v, false)).toMatchObject({ age: 9, gender: 'female', guardian: { source: 'referral' } });
  });

  it('ageError: blank is fine; anything but a whole 3–99 gets the form’s message', () => {
    expect(ageError('')).toBeUndefined();
    expect(ageError('12')).toBeUndefined();
    expect(parseAge('12')).toBe(12);
    for (const bad of ['2', '100', '7.5', 'سبعة']) expect(ageError(bad)).toBe(t.students.ageInvalid);
    expect(t.students.ageInvalid).toBe('اكتب العمر بالأرقام (من 3 إلى 99)');
  });

  it('duplicateCandidates: only a 409 duplicate_student body yields candidates', () => {
    const candidates = [{ id: 's1', code: 'AB-0183', name: 'سهيلة', status: 'trial' }];
    const dup = new ApiError(409, { message: 'duplicate_student', guardian_id: 'g1', candidates });
    expect(duplicateCandidates(dup)).toEqual(candidates);
    expect(duplicateCandidates(new ApiError(409, { message: 'phone_taken' }))).toBeNull();
    expect(duplicateCandidates(new ApiError(500))).toBeNull();
    expect(duplicateCandidates(new Error('x'))).toBeNull();
  });
});
