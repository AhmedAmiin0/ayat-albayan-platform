import { act, fireEvent, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { t } from '../../../lib/i18n/i18n';
import { signOutDevice } from '../../../lib/session/sign-out';
import { freshQueryClient, renderWithQuery } from '../../../testing/query';
import { bioLock } from '../../core/bio-lock';
import type { bioLockMock } from '../../../testing/bio-lock';
import { BiometricGate } from './BiometricGate';

// The gate over a signed-in app, with the store's native modules mocked (testing/bio-lock).

jest.mock(
  '../../core/bio-lock',
  () => jest.requireActual<{ bioLockMock: object }>('../../../testing/bio-lock').bioLockMock,
);
jest.mock('../../../lib/session/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));
const fake = jest.requireMock<typeof bioLockMock>('../../core/bio-lock');

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const gate = (signedIn: boolean, children: ReactNode) => (
  <SafeAreaProvider initialMetrics={metrics}>
    <BiometricGate signedIn={signedIn}>{children}</BiometricGate>
  </SafeAreaProvider>
);
const app = (signedIn = true) =>
  renderWithQuery(gate(signedIn, <Text>المحتوى</Text>), freshQueryClient());

beforeEach(() => fake.reset());

test('switch off: the app alone, nothing over it, nothing hidden', async () => {
  await fake.boot({ enabled: false });
  await app();
  expect(screen.getByText('المحتوى')).toBeTruthy();
  expect(screen.queryByTestId('biometric-lock')).toBeNull();
  expect(screen.queryByTestId('biometric-cover')).toBeNull();
});

test('while the flag is read the app is covered and hidden from screen readers', async () => {
  await app();
  expect(screen.getByTestId('biometric-cover')).toBeTruthy();
  expect(screen.queryByText('المحتوى')).toBeNull();
});

test('switch on: the lock prompts by itself, and success dissolves it into the app', async () => {
  await fake.boot({ enabled: true });
  await app();
  expect(screen.getByRole('button', { name: t.biometric.unlock.fingerprint })).toBeTruthy();
  await fireEvent(screen.getByTestId('biometric-lock'), 'layout', {});
  expect(fake.auth.authenticateAsync).toHaveBeenCalledTimes(1);
  expect(await screen.findByText('المحتوى')).toBeTruthy();
  expect(screen.queryByTestId('biometric-lock')).toBeNull();
});

test('cancel: stays on the lock with the retry and the other way; retry gets in', async () => {
  await fake.boot({ enabled: true });
  fake.auth.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
  await app();
  await fireEvent(screen.getByTestId('biometric-lock'), 'layout', {});
  expect(await screen.findByText(t.biometric.failed)).toBeTruthy();
  expect(screen.queryByText('المحتوى')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.biometric.unlock.fingerprint }));
  expect(await screen.findByText('المحتوى')).toBeTruthy();
});

test('«الدخول بطريقة أخرى» signs out; the cover stays until the gate shows the sign-in', async () => {
  await fake.boot({ enabled: true });
  fake.auth.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
  const view = await app();
  await fireEvent(screen.getByTestId('biometric-lock'), 'layout', {});
  await fireEvent.press(await screen.findByRole('button', { name: t.biometric.otherWay }));
  expect(signOutDevice).toHaveBeenCalled();
  await act(async () => fake.fake.lock.signedOut());
  expect(screen.getByTestId('biometric-cover')).toBeTruthy();
  await view.rerender(gate(false, <Text>تسجيل الدخول</Text>));
  expect(screen.getByText('تسجيل الدخول')).toBeTruthy();
});

test('signed out: never covered, whatever the flag', async () => {
  await fake.boot({ enabled: true });
  await app(false);
  expect(screen.getByText('المحتوى')).toBeTruthy();
});

test('Face ID devices name it on the button', async () => {
  await fake.boot({ enabled: true, types: [2] });
  await app();
  expect(screen.getByRole('button', { name: t.biometric.unlock.face })).toBeTruthy();
});

test('the offer after a fresh sign-in: «ليس الآن» hides it for good', async () => {
  await fake.boot({ enabled: false });
  await act(async () => fake.fake.lock.signedIn());
  await app();
  expect(screen.getByText(t.biometric.offerTitle.fingerprint)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.biometric.notNow }));
  expect(screen.queryByText(t.biometric.offerTitle.fingerprint)).toBeNull();
  expect(bioLock.getSnapshot().offer).toBe(false);
});

test('biometrics gone with the flag on: no unlock button, only the other way (fails closed)', async () => {
  await fake.boot({ enabled: true, enrolled: false });
  await app();
  expect(screen.getByTestId('biometric-lock')).toBeTruthy();
  expect(screen.queryByText('المحتوى')).toBeNull();
  expect(screen.queryByRole('button', { name: t.biometric.unlock.fingerprint })).toBeNull();
  expect(screen.getByRole('button', { name: t.biometric.otherWay })).toBeTruthy();
});
