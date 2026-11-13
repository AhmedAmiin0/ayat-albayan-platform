import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery, teacherPagesClient } from '@/test/query';
import { guardedTeacherRoute, TeacherPageGuard } from './TeacherPageGuard';

const mockApiFetch = jest.fn();
const mockRedirect = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => {
    mockRedirect(props.href);
    return null;
  },
}));

const Page = () => <Text>the page</Text>;
const Earnings = guardedTeacherRoute('earnings', Page);

beforeEach(() => {
  mockApiFetch.mockReset();
  mockRedirect.mockReset();
});

test('waits for GET /settings/public: a spinner, no page, no redirect', async () => {
  mockApiFetch.mockReturnValue(new Promise(() => undefined));
  await renderWithQuery(<Earnings />);
  expect(screen.getByLabelText(t.common.loading)).toBeTruthy();
  expect(screen.queryByText('the page')).toBeNull();
  expect(mockRedirect).not.toHaveBeenCalled();
});

test('a fetched answer with the switch off goes to «اليوم»', async () => {
  mockApiFetch.mockResolvedValue({ ...PUBLIC_SETTING_DEFAULTS, custom: {} });
  await renderWithQuery(<Earnings />);
  await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/teacher/today'));
  expect(screen.queryByText('the page')).toBeNull();
});

test('a fetched answer with the switch on shows the screen', async () => {
  const config = { ...PUBLIC_SETTING_DEFAULTS, custom: {}, teacher_earnings_enabled: true };
  mockApiFetch.mockResolvedValue(config);
  await renderWithQuery(<Earnings />);
  expect(await screen.findByText('the page')).toBeTruthy();
  expect(mockRedirect).not.toHaveBeenCalled();
});

test('settings that cannot be read: an error with retry, never a silent redirect', async () => {
  mockApiFetch.mockRejectedValue(new TypeError('Network request failed'));
  await renderWithQuery(<Earnings />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(mockRedirect).not.toHaveBeenCalled();
});

test('the meetings routes open with either meetings switch', async () => {
  const client = teacherPagesClient(false, { teacher_internal_meetings_enabled: true });
  await renderWithQuery(<TeacherPageGuard gate="meetings"><Page /></TeacherPageGuard>, client);
  expect(screen.getByText('the page')).toBeTruthy();
});
