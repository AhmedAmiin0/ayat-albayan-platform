import { screen } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { TeacherTabs } from './TeacherTabs';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));
// The tabs themselves are the router's (routing.teacher.test); here only what wraps them.
jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  const Tabs = () => <Text>teacher-tabs</Text>;
  Tabs.Screen = () => null;
  return { Tabs };
});
jest.mock('@/more/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

beforeEach(() => mockApiFetch.mockReset());

test('a login with no teacher file: says so and offers sign-out, no tabs', async () => {
  mockApiFetch.mockRejectedValue(new ApiError(404, { code: 'teacher_not_linked' }));
  await renderWithQuery(<TeacherTabs />);
  expect(await screen.findByText(t.teacherDash.notLinked)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.auth.logout })).toBeTruthy();
  expect(screen.queryByText('teacher-tabs')).toBeNull();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me');
});

test('a linked teacher gets her tabs; offline (no answer) the tabs still open on saved data', async () => {
  mockApiFetch.mockResolvedValueOnce({ id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] });
  await renderWithQuery(<TeacherTabs />);
  expect(await screen.findByText('teacher-tabs')).toBeTruthy();
  mockApiFetch.mockRejectedValue(new TypeError('Network request failed'));
  await renderWithQuery(<TeacherTabs />);
  expect(screen.getAllByText('teacher-tabs').length).toBeGreaterThan(0);
  expect(screen.queryByText(t.teacherDash.notLinked)).toBeNull();
});
