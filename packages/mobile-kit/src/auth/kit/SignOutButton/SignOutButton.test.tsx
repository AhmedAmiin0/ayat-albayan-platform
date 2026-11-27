import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { signOutDevice } from '../../../lib/session/sign-out';
import { SignOutButton } from './SignOutButton';

jest.mock('../../../lib/session/sign-out', () => ({ signOutDevice: jest.fn() }));

const signOut = jest.mocked(signOutDevice);

beforeEach(() => jest.clearAllMocks());

test('signs the device out and reads as busy until it settles', async () => {
  let settle = (): void => undefined;
  signOut.mockReturnValue(new Promise<void>((resolve) => (settle = resolve)));
  await render(<SignOutButton />);
  await fireEvent.press(screen.getByRole('button', { name: t.auth.logout }));
  expect(signOut).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: t.auth.logout })).toBeBusy();
  await act(async () => settle());
  expect(screen.getByRole('button', { name: t.auth.logout })).not.toBeBusy();
});

test('a second press while leaving does not sign out twice', async () => {
  signOut.mockReturnValue(new Promise<void>(() => undefined));
  await render(<SignOutButton />);
  await fireEvent.press(screen.getByRole('button', { name: t.auth.logout }));
  await fireEvent.press(screen.getByRole('button', { name: t.auth.logout }));
  expect(signOut).toHaveBeenCalledTimes(1);
});
