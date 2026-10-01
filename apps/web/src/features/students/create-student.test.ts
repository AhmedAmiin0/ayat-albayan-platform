import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { duplicateCandidates } from './api';
import { EMPTY_STUDENT, phoneError, toCreateBody } from './create-student';

describe('create student helpers (R-STU-02, R-STU-03)', () => {
  it('phoneError: accepts any Saudi/Egyptian format, explains rejects in Arabic', () => {
    expect(phoneError('0501234567')).toBeUndefined();
    expect(phoneError('+966 50 123 4567')).toBeUndefined();
    expect(phoneError('@suhaila')).toBe(t.common.phoneErrors.not_a_number);
    expect(phoneError('12345')).toBe(t.common.phoneErrors.missing_country_code);
    expect(phoneError('')).toBe(t.common.phoneErrors.empty);
  });

  it('toCreateBody: one tz for student and guardian, trimmed names, force flag', () => {
    const v = { ...EMPTY_STUDENT, guardianPhone: '0501234567', guardianName: ' ام جود ', name: ' سهيلة ' };
    expect(toCreateBody(v, true)).toEqual({
      name: 'سهيلة',
      tz: 'Asia/Riyadh',
      program: 'quran',
      guardian: { name: 'ام جود', phone_e164: '0501234567', tz: 'Asia/Riyadh' },
      force: true,
    });
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
