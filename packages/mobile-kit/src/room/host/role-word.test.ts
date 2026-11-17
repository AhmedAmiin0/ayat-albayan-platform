import { tile } from '../state/room-test-kit';
import { t } from '../../lib/i18n/i18n';
import { roleWord } from './role-word';

test('a family-link guest the lesson knows reads «الطالب» / «ولي الأمر», never «ضيف»', () => {
  const guest = tile({ name: 'يوسف', role: 'guest' });
  expect(roleWord(guest, [{ name: 'يوسف', role: 'student' }])).toBe(t.studentChannel.roles.student);
  expect(roleWord(guest, [{ name: 'يوسف', role: 'guardian' }])).toBe(
    t.studentChannel.roles.guardian,
  );
  expect(roleWord(guest, [])).toBe(t.classroom.roles.guest);
});

test('staff keep their token role; no role, no word', () => {
  expect(roleWord(tile({ role: 'teacher' }), [])).toBe(t.classroom.roles.teacher);
  expect(roleWord(tile({ role: null }), [])).toBeNull();
});
