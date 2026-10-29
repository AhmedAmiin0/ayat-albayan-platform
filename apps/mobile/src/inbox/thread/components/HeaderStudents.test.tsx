import type { ThreadStudentView } from '@ab/shared';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { type TreeBase, TreeBaseProvider } from '@/core/nav/tree-base';
import { child, CHILD_ID } from '../../subscription/people-fixtures';
import { ChatHeader } from './ChatHeader';
import { useHeaderStudents } from './HeaderStudents';

// Owner 2026-10-29: tapping the chat's name or number opens the student's details, as WhatsApp's contact.
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

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

test('one student: the name opens «تفاصيل الطالب» in the sales tree', async () => {
  await show([child()]);
  expect(names().props.accessibilityHint).toBe(t.inbox.studentDetails);
  await fireEvent.press(names());
  expect(router.push).toHaveBeenCalledWith(`/sales/students/${CHILD_ID}`);
});

test('in the admin tree it opens the student file', async () => {
  await show([child()], '');
  await fireEvent.press(names());
  expect(router.push).toHaveBeenCalledWith(`/students/${CHILD_ID}`);
});

test('several students: a sheet of «name · code», each opens its own', async () => {
  await show([child(), child({ id: 's-2', name: 'مريم', code: 'AB-0200' })]);
  await fireEvent.press(names());
  await fireEvent.press(within(screen.getByTestId('thread-menu')).getByRole('button', { name: 'مريم · AB-0200' }));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/sales/students/s-2'));
});

test('no student (a lead) or the assistant tree: the name is not a button', async () => {
  await show([]);
  expect(names().props.accessibilityRole).toBeUndefined();
  await show([child()], '/assistant');
  expect(screen.getAllByTestId('chat-names').at(-1)?.props.accessibilityRole).toBeUndefined();
});
