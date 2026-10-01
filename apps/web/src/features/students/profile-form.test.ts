import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { toProfileValues, toStudentPatch } from './profile-form';
import type { StudentProfile } from './types';

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
    const r = toStudentPatch({ ...toProfileValues(PROFILE), status: 'active', teacher_id: '' });
    expect(r).toEqual({
      ok: true,
      patch: expect.objectContaining({ status: 'active', teacher_id: null, memorized: null, riwaya: 'حفص' }),
    });
  });

  it('a bad meeting link names the field in Arabic', () => {
    const r = toStudentPatch({ ...toProfileValues(PROFILE), meeting_link_override: 'not a link' });
    expect(r).toEqual({ ok: false, error: t.students.invalidField.replace('{field}', t.students.meetingLink) });
  });

  it('an unknown time zone or empty name is rejected', () => {
    expect(toStudentPatch({ ...toProfileValues(PROFILE), tz: 'Mars/Base' }).ok).toBe(false);
    expect(toStudentPatch({ ...toProfileValues(PROFILE), name: '  ' })).toEqual({
      ok: false,
      error: t.students.invalidField.replace('{field}', t.students.name),
    });
  });
});
