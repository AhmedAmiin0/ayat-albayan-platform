import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import type { Teacher } from './api';
import { apiErrorMessage, emptyTeacherForm, toTeacherForm, validateTeacher } from './teacher-form';

const filled = { ...emptyTeacherForm(), display_name_ar: 'أ. سارة', phone_e164: '01001234567', rate_60: '120' };

describe('teacher form (R-TCH-01)', () => {
  it('builds an API payload: E.164 phone, numbers, blanks → null', () => {
    const r = validateTeacher(filled);
    expect(r).toEqual({
      ok: true,
      payload: expect.objectContaining({
        display_name_ar: 'أ. سارة',
        display_name_en: null,
        phone_e164: '+201001234567',
        meeting_link: null,
        rate_30: null,
        rate_60: 120,
        max_students: null,
        status: 'active',
        tz: 'Africa/Cairo',
      }),
    });
  });

  it.each([
    [{ display_name_ar: '' }, t.common.required],
    [{ phone_e164: '@ayat' }, t.common.phoneErrors.not_a_number],
    [{ programs: [] }, t.teachers.programsRequired],
    [{ meeting_link: 'meet' }, t.teachers.invalidLink],
    [{ rate_30: '-5' }, t.teachers.invalidNumber],
    [{ max_students: '2.5' }, t.teachers.invalidNumber],
    [{ tz: 'Cairo' }, t.common.invalidTimeZone],
  ])('rejects %j with an Arabic message', (patch, message) => {
    expect(validateTeacher({ ...filled, ...patch })).toEqual({ ok: false, error: message });
  });

  it('fills the form from a teacher row (nulls → empty inputs)', () => {
    const teacher: Teacher = {
      id: 't1',
      display_name_ar: 'أ. محمد',
      display_name_en: null,
      gender: 'male',
      programs: ['quran', 'arabic'],
      phone_e164: '+966501234567',
      meeting_link: null,
      meeting_mode: 'platform',
      platform_classroom: true,
      rate_30: 50,
      rate_45: null,
      max_students: 10,
      status: 'inactive',
      tz: 'Asia/Riyadh',
    };
    expect(toTeacherForm(teacher)).toMatchObject({
      display_name_en: '',
      meeting_link: '',
      rate_30: '50',
      rate_45: '',
      rate_90: '',
      max_students: '10',
      status: 'inactive',
      meeting_mode: 'platform',
    });
  });

  it('sends meeting_mode: the chosen mode, null for «حسب إعداد الأكاديمية»', () => {
    expect(emptyTeacherForm().meeting_mode).toBeNull();
    expect(validateTeacher(filled)).toMatchObject({ ok: true, payload: { meeting_mode: null } });
    expect(validateTeacher({ ...filled, meeting_mode: 'static' })).toMatchObject({ ok: true, payload: { meeting_mode: 'static' } });
  });

  it('maps API errors to Arabic messages', () => {
    expect(apiErrorMessage(new ApiError(409, { message: 'duplicate' }))).toBe(t.teachers.phoneTaken);
    const issues = [{ path: 'phone_e164', message: 'invalid_length' }];
    expect(apiErrorMessage(new ApiError(400, { issues }))).toBe(t.common.phoneErrors.invalid_length);
    expect(apiErrorMessage(new ApiError(500))).toBe(t.common.error);
    expect(apiErrorMessage(new Error('network'))).toBe(t.common.error);
  });
});
