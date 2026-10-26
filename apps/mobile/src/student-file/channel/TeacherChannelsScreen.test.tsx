import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { TeacherChannelsScreen } from './TeacherChannelsScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: (mockHref: string) => mockPush(mockHref), back: jest.fn() },
}));

const c = t.studentChannel;

test('«رسائل الطلاب»: my current students with the last message and the unread count; a tap opens the thread', async () => {
  mockApiFetch.mockResolvedValue([
    { student_id: 's1', student_name: 'سلمى', student_code: 'AB-0201', unread: 2, last_message: { body: 'متى الحلقة؟', sender_role: 'guardian', created_at: '2026-10-27T10:00:00.000Z' } },
    { student_id: 's2', student_name: 'يوسف', student_code: 'AB-0202', unread: 0, last_message: null },
  ]);
  await renderWithQuery(<TeacherChannelsScreen />);
  expect(await screen.findByText('متى الحلقة؟')).toBeTruthy();
  expect(screen.getByText(c.unread.replace('{n}', '2'))).toBeTruthy();
  expect(screen.getByText(c.noMessageYet)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/channels');
  fireEvent.press(screen.getByText('سلمى'));
  expect(mockPush).toHaveBeenCalledWith('/teacher/more/messages/s1');
});

test('no current student: the empty state', async () => {
  mockApiFetch.mockResolvedValue([]);
  await renderWithQuery(<TeacherChannelsScreen />);
  expect(await screen.findByText(c.listEmpty)).toBeTruthy();
});
