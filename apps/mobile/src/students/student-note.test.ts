import { t } from '@/lib/i18n';
import { studentNote } from './student-note';

test.each([
  ['trial', null, t.alerts.needsTeacher],
  ['active', null, t.alerts.needsTeacher],
  ['active', 'أ. منى', null],
  ['pending_renewal', null, t.alerts.needsTeacher],
  ['pending_renewal', 'أ. منى', null],
  ['paused', null, null],
  ['churned', null, null],
] as const)('%s with teacher %s → %s', (status, teacher_name, note) => {
  expect(studentNote({ status, teacher_name })).toBe(note);
});
