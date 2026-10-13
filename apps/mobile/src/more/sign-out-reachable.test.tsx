import { fireEvent, screen, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { AssistantMoreScreen } from '@/assistant-app/AssistantMoreScreen';
import { t } from '@/lib/i18n';
import { SalesMoreScreen } from '@/sales-app/SalesMoreScreen';
import { TeacherMoreScreen } from '@/teacher/TeacherMoreScreen';
import { renderWithQuery } from '@/test/query';
import { MoreScreen } from './MoreScreen';
import { signOutDevice } from './sign-out';

// «تسجيل الخروج» is the last block of every «المزيد»: it must sit in the scrolling body, or a long
// list (the admin's sections, a small phone) pushes it below the tab bar where it cannot be tapped.
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('./sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: jest.fn(jest.requireActual('@/test/account').fetchWithProfile({ id: 't1', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] })),
}));

const all = () => true;

beforeEach(() => jest.clearAllMocks());

test.each<[string, () => ReactElement]>([
  ['admin', () => <MoreScreen can={all} />],
  ['teacher', () => <TeacherMoreScreen />],
  ['sales', () => <SalesMoreScreen can={all} />],
  ['assistant', () => <AssistantMoreScreen />],
])('the %s «المزيد» scrolls, sign-out included, and it signs out', async (_tree, view) => {
  await renderWithQuery(view());
  const logout = within(screen.getByTestId('screen-scroll')).getByRole('button', { name: t.auth.logout });
  await fireEvent.press(logout);
  expect(signOutDevice).toHaveBeenCalledTimes(1);
});

test('the header stays above the scrolling body', async () => {
  await renderWithQuery(<MoreScreen can={all} />);
  expect(within(screen.getByTestId('screen-scroll')).queryByRole('header', { name: t.mobile.more })).toBeNull();
  expect(screen.getByRole('header', { name: t.mobile.more })).toBeTruthy();
});
