import type { TeacherChannelRow } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { previewOf } from './teacher-row';

const c = t.studentChannel;
const row = (
  last: Partial<NonNullable<TeacherChannelRow['last_message']>> | null,
): TeacherChannelRow => ({
  ...{ student_id: 's1', student_name: 'سلمى', student_code: 'AB-0201', unread: 0 },
  last_message: last && {
    body: 'متى الحلقة؟',
    sender_role: 'guardian',
    created_at: '2026-10-27T10:00:00Z',
    deleted: false,
    ...last,
  },
});

test('the last message after who wrote it: the family by role, the teacher as «أنت»', () => {
  expect(previewOf(row({}))).toBe(`${c.roles.guardian}: متى الحلقة؟`);
  expect(previewOf(row({ sender_role: 'student' }))).toBe(`${c.roles.student}: متى الحلقة؟`);
  expect(previewOf(row({ sender_role: 'teacher', body: 'غدًا' }))).toBe(`${c.you}: غدًا`);
});

test('deleted, wordless (a file) and no message yet', () => {
  expect(previewOf(row({ deleted: true, body: '' }))).toBe(
    `${c.roles.guardian}: ${c.actions.deleted}`,
  );
  expect(previewOf(row({ body: '' }))).toBe(`${c.roles.guardian}: ${c.kinds.text}`);
  expect(previewOf(row(null))).toBe(c.noMessageYet);
});
