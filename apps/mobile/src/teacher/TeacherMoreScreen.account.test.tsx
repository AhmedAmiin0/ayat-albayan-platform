import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { TeacherMoreScreen } from './TeacherMoreScreen';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: jest.fn(jest.requireActual('@/test/account').fetchWithProfile({ id: 't1', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] })),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/more/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

test('R-ACC-01/05: the teacher’s More has «حسابي» and the avatar in its header', async () => {
  await renderWithQuery(<TeacherMoreScreen />);
  expect(await screen.findByTestId('profile-avatar-initials', { includeHiddenElements: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.account.mobile.open }));
  expect(router.push).toHaveBeenCalledWith('/teacher/more/account');
  await fireEvent.press(screen.getByText(t.account.nav));
  expect(router.push).toHaveBeenLastCalledWith('/teacher/more/account');
});
