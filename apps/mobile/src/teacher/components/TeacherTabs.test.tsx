import { screen } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { TeacherTabs } from './TeacherTabs';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));
// The tabs themselves are the router's (routing.teacher.test, ui/GlassTabBar.test); here only what wraps them.
jest.mock('@/core/ui/layout/AppNativeTabs', () => {
  const { Text } = jest.requireActual('react-native');
  return { AppNativeTabs: () => <Text>teacher-tabs</Text> };
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
