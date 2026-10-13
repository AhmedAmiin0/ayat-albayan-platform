import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { signOutDevice } from '@/more/sign-out';
import { NotLinkedScreen } from './NotLinkedScreen';

// A teacher login with no teacher file has one way out, «تسجيل الخروج»: it must sit in the
// scrolling body, or a small phone or a large text size pushes it below the bottom of the screen.
jest.mock('@/more/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

beforeEach(() => jest.clearAllMocks());

test('says the login is not linked; sign-out scrolls with the body and signs out', async () => {
  await render(<NotLinkedScreen />);
  const body = screen.getByTestId('screen-scroll');
  expect(within(body).getByText(t.teacherDash.notLinked)).toBeTruthy();
  await fireEvent.press(within(body).getByRole('button', { name: t.auth.logout }));
  expect(signOutDevice).toHaveBeenCalledTimes(1);
});

test('the header stays above the scrolling body', async () => {
  await render(<NotLinkedScreen />);
  expect(screen.getByRole('header', { name: t.teacherDash.title })).toBeTruthy();
  expect(within(screen.getByTestId('screen-scroll')).queryByRole('header', { name: t.teacherDash.title })).toBeNull();
});
