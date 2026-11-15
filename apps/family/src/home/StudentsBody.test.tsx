import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable } from 'react-native';
import { AppText, t } from '@ab/mobile-kit';
import { StudentsBody } from './StudentsBody';

const student = (id: string, name: string) => ({
  id,
  code: `AB-${id}`,
  name,
  tz: 'Asia/Riyadh',
  contact_is_self: false,
});
const children = [student('0001', 'سارة'), student('0002', 'يوسف')];
const onOpen = jest.fn();
const props = {
  isError: false,
  onRetry: jest.fn(),
  card: (s: (typeof children)[number]) => (
    <Pressable accessibilityRole="button" onPress={() => onOpen(s.id)}>
      <AppText>{s.name}</AppText>
    </Pressable>
  ),
};
const me = (students: typeof children) => ({
  kind: 'guardian' as const,
  students,
  renew_url: null,
});

beforeEach(() => jest.clearAllMocks());

test('skeleton cards while /portal/me loads, named once for screen readers', async () => {
  await render(<StudentsBody {...props} data={undefined} />);
  expect(screen.getAllByTestId('skeleton-card', { includeHiddenElements: true })).toHaveLength(2);
  expect(screen.getByLabelText(t.familyApp.home.loading)).toBeTruthy();
});

test('one card per child; a press opens that child', async () => {
  await render(<StudentsBody {...props} data={me(children)} />);
  expect(screen.getByText('سارة')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: /يوسف/ }));
  expect(onOpen).toHaveBeenCalledWith('0002');
});

test('no children: the empty note; a failed first read: the retry', async () => {
  const view = await render(<StudentsBody {...props} data={me([])} />);
  expect(screen.getByText(t.familyApp.home.empty)).toBeTruthy();
  await view.rerender(<StudentsBody {...props} isError data={undefined} />);
  expect(screen.queryByText(t.familyApp.home.empty)).toBeNull();
  expect(screen.getByRole('button')).toBeTruthy();
});
