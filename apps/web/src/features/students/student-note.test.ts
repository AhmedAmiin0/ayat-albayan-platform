import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { studentNote } from './student-note';

describe('studentNote (hamish, docs/07 §6)', () => {
  it('a trial or active student without a teacher needs one', () => {
    expect(studentNote({ teacher_name: null, status: 'trial' })).toBe(t.alerts.needsTeacher);
    expect(studentNote({ teacher_name: null, status: 'active' })).toBe(t.alerts.needsTeacher);
  });

  it('no note with a teacher, or for paused / churned students', () => {
    expect(studentNote({ teacher_name: 'أ. هبة', status: 'active' })).toBeNull();
    expect(studentNote({ teacher_name: null, status: 'paused' })).toBeNull();
    expect(studentNote({ teacher_name: null, status: 'churned' })).toBeNull();
  });
});
