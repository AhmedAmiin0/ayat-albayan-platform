import type { ThreadStudentView } from '@ab/shared';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { type TreeBase, TreeBaseProvider } from '@/core/nav/tree-base';
import { child, CHILD_ID } from '@/inbox/subscription/people-fixtures';
import { ChatHeader } from './ChatHeader';
import { studentLine, useHeaderStudents } from './HeaderStudents';

// Owner 2026-10-29: tapping the chat's name or number opens the student's details, as WhatsApp's contact.
// docs/37 NEW 2: the details screen gets the chat's phone (`?phone=`) for «بحث في الرسائل».
const mockParams = jest.fn(() => ({ phone: '+966500000123' }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useLocalSearchParams: () => mockParams() }));
const Q = `?phone=${encodeURIComponent('+966500000123')}`;

function Header({ students }: { students: ThreadStudentView[] }) {
  const who = useHeaderStudents(students);
  return (
    <>
      <ChatHeader title="أم يوسف" onBack={jest.fn()} onTitlePress={who.onPress} />
      {who.sheet}
    </>
  );
}

const show = (students: ThreadStudentView[], base: TreeBase = '/sales') =>
  render(
    <TreeBaseProvider value={base}>
      <Header students={students} />
    </TreeBaseProvider>,
  );

const names = () => screen.getByTestId('chat-names');

beforeEach(() => jest.clearAllMocks());

test('one student: the name opens «تفاصيل الطالب» above the sales chat (back returns to it)', async () => {
  await show([child()]);
  expect(names().props.accessibilityHint).toBe(t.inbox.studentDetails);
  await fireEvent.press(names());
  expect(router.push).toHaveBeenCalledWith(`/sales/inbox/student/${CHILD_ID}${Q}`);
});

test('in the admin tree it opens the student file above the chat', async () => {
  await show([child()], '');
  await fireEvent.press(names());
  expect(router.push).toHaveBeenCalledWith(`/inbox/student/${CHILD_ID}${Q}`);
});

test('several students: a sheet of «name · code · status · teacher», each opens its own', async () => {
  const second = child({ id: 's-2', name: 'مريم', code: 'AB-0200', status: 'paused', teacher_name: null });
  await show([child(), second]);
  await fireEvent.press(names());
  const label = `مريم · AB-0200 · ${t.enums.studentStatus.paused}`;
  expect(studentLine(second)).toBe(label);
  expect(studentLine(child())).toBe(`${child().name} · ${child().code} · ${t.enums.studentStatus.active} · مريم المعلمة`);
  await fireEvent.press(within(screen.getByTestId('thread-menu')).getByRole('button', { name: label }));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/sales/inbox/student/s-2${Q}`));
});

test('no student (a lead) or the assistant tree: the name is not a button', async () => {
  await show([]);
  expect(names().props.accessibilityRole).toBeUndefined();
  await show([child()], '/assistant');
  expect(screen.getAllByTestId('chat-names').at(-1)?.props.accessibilityRole).toBeUndefined();
});

test('outside a chat route (no phone param) the href carries no phone', async () => {
  mockParams.mockReturnValueOnce({ phone: '' });
  await show([child()], '');
  await fireEvent.press(names());
  expect(router.push).toHaveBeenCalledWith(`/inbox/student/${CHILD_ID}`);
});
