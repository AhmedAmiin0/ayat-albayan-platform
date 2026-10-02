import { isOwnThread, sentByName, threadBase, threadLink, type ThreadMode } from './thread-mode';
import { message, PHONE, thread } from './thread-fixtures';

const admin: ThreadMode = { kind: 'admin' };
const abrar: ThreadMode = { kind: 'teacher', teacherId: 't-abrar' };

test('each mode links into its own tab', () => {
  expect(threadLink(PHONE, admin)).toBe('/inbox/thread/%2B966552147730');
  expect(threadLink(PHONE, abrar)).toBe('/teacher/chats/%2B966552147730');
  expect(threadBase(admin)).toBe('/inbox');
  expect(threadBase(abrar)).toBe('/teacher/chats');
});

test('only the teacher’s own chat with the academy is her own thread', () => {
  const own = { ...thread, teacher_id: 't-abrar' };
  expect(isOwnThread(abrar, own)).toBe(true);
  expect(isOwnThread(abrar, { ...thread, teacher_id: 't-other' })).toBe(false);
  expect(isOwnThread(abrar, thread)).toBe(false);
  expect(isOwnThread(abrar, null)).toBe(false);
  expect(isOwnThread(admin, own)).toBe(false);
});

test('sentByName reads the teacher who sent a row, else null', () => {
  const byAbrar = { ...message({ id: 'a' }), sent_by_teacher_name: 'أبرار' };
  const byAcademy = { ...message({ id: 'b' }), sent_by_teacher_name: null };
  expect(sentByName(byAbrar)).toBe('أبرار');
  expect(sentByName(byAcademy)).toBeNull();
  expect(sentByName(message({ id: 'c' }))).toBeNull();
});
