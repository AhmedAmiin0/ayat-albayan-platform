import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { toProfileValues, toStudentPatch } from './profile-form';
import type { StudentProfile } from '@/features/people/students/types';

const PROFILE = {
  id: 's1',
  name: 'سهيلة',
  program: 'quran',
  status: 'trial',
  teacher_id: null,
  tz: 'Asia/Riyadh',
  level: 'مبتدئ',
  memorized: null,
  goal: null,
  riwaya: 'حفص',
  meeting_link_override: null,
  notes: null,
} as StudentProfile;

describe('profile form mapping (R-STU-05)', () => {
  it('nulls become empty inputs', () => {
    const v = toProfileValues(PROFILE);
    expect(v.teacher_id).toBe('');
    expect(v.memorized).toBe('');
    expect(v.riwaya).toBe('حفص');
  });

  it('round-trips into a valid patch with empty inputs as null', () => {
    const r = toStudentPatch({ ...toProfileValues(PROFILE), status: 'active', teacher_id: '' }, 'trial');
    expect(r).toEqual({
      ok: true,
      patch: expect.objectContaining({ status: 'active', teacher_id: null, memorized: null, riwaya: 'حفص' }),
    });
  });

  it('status goes out only when changed, with the loaded status as expected_status', () => {
    const same = toStudentPatch(toProfileValues(PROFILE), 'trial');
    expect(same.ok && 'status' in same.patch).toBe(false);
    expect(same.ok && 'expected_status' in same.patch).toBe(false);
    const moved = toStudentPatch({ ...toProfileValues(PROFILE), status: 'paused' }, 'trial');
    expect(moved).toEqual({ ok: true, patch: expect.objectContaining({ status: 'paused', expected_status: 'trial' }) });
  });

  it('«عمر الطالب» and «النوع» (research-forms 1): a number or null, the form’s age message', () => {
    const v = toProfileValues({ ...PROFILE, age: 9, gender: 'female' });
    expect(v).toMatchObject({ age: '9', gender: 'female' });
    expect(toStudentPatch(v, 'trial')).toEqual({ ok: true, patch: expect.objectContaining({ age: 9, gender: 'female' }) });
    expect(toStudentPatch({ ...v, age: '', gender: '' }, 'trial')).toEqual({ ok: true, patch: expect.objectContaining({ age: null, gender: null }) });
    expect(toStudentPatch({ ...v, age: '2' }, 'trial')).toEqual({ ok: false, error: t.students.ageInvalid });
  });

  it('a bad meeting link names the field in Arabic', () => {
    const r = toStudentPatch({ ...toProfileValues(PROFILE), meeting_link_override: 'not a link' }, 'trial');
    expect(r).toEqual({ ok: false, error: t.students.invalidField.replace('{field}', t.students.meetingLink) });
  });

  it('an unknown time zone or empty name is rejected', () => {
    expect(toStudentPatch({ ...toProfileValues(PROFILE), tz: 'Mars/Base' }, 'trial').ok).toBe(false);
    expect(toStudentPatch({ ...toProfileValues(PROFILE), name: '  ' }, 'trial')).toEqual({
      ok: false,
      error: t.students.invalidField.replace('{field}', t.students.name),
    });
  });
});
