import { t } from '@/lib/i18n';
import { isOwnThread, senderText, threadBase, threadLink, type ThreadMode } from './thread-mode';
import { message, PHONE, thread } from './thread-fixtures';

const admin: ThreadMode = { kind: 'admin' };
const abrar: ThreadMode = { kind: 'teacher', teacherId: 't-abrar' };
const by = (name: string) => t.inbox.sentBy.replace('{name}', name);

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

test('senderText: a teacher, the admin and an assistant by name', () => {
  const teacher = message({ id: 'a', sender_name: 'أبرار', sent_by_teacher_name: 'أبرار' });
  expect(senderText(teacher)).toBe(by('أبرار'));
  expect(senderText(message({ id: 'b', sender_name: 'أحمد أمين' }))).toBe(by('أحمد أمين'));
  expect(senderText(message({ id: 'c', sender_name: 'سارة', automatic: false }))).toBe(by('سارة'));
});

test('senderText: a job’s row is «رسالة تلقائية»', () => {
  expect(senderText(message({ id: 'a', sender_name: null, automatic: true }))).toBe(t.inbox.automaticMessage);
});

test('senderText: imported history, inbound rows and the optimistic row say nothing', () => {
  expect(senderText(message({ id: 'a', sender_name: null, automatic: false }))).toBeNull();
  expect(senderText(message({ id: 'b', direction: 'inbound', sender_name: 'هدى', automatic: true }))).toBeNull();
  expect(senderText(message({ id: 'c' }))).toBeNull();
});

test('senderText: an old cached row with only sent_by_teacher_name still names her', () => {
  expect(senderText(message({ id: 'a', sent_by_teacher_name: 'أبرار' }))).toBe(by('أبرار'));
  expect(senderText(message({ id: 'b', sent_by_teacher_name: null }))).toBeNull();
});
