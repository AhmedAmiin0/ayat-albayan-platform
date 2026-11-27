import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { t } from '../../../lib/i18n/i18n';
import type { bioLockMock } from '../../../testing/bio-lock';
import { BiometricOffer } from './BiometricOffer';

jest.mock(
  '../../core/bio-lock',
  () => jest.requireActual<{ bioLockMock: object }>('../../../testing/bio-lock').bioLockMock,
);
const fake = jest.requireMock<typeof bioLockMock>('../../core/bio-lock');

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const offer = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <BiometricOffer kind="face" visible />
    </SafeAreaProvider>,
  );

beforeEach(() => fake.reset());

test('names the device method and turns the lock on after one confirmation', async () => {
  await fake.boot({ enabled: false, types: [2] });
  await offer();
  expect(screen.getByText(t.biometric.offerTitle.face)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.biometric.enable }));
  expect(fake.auth.authenticateAsync).toHaveBeenCalledTimes(1);
  expect(fake.bioLock.getSnapshot().lock.enabled).toBe(true);
});

test('a cancelled confirmation leaves the lock off and the buttons usable', async () => {
  await fake.boot({ enabled: false, types: [2] });
  fake.auth.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
  await offer();
  await fireEvent.press(screen.getByRole('button', { name: t.biometric.enable }));
  expect(fake.bioLock.getSnapshot().lock.enabled).toBe(false);
  expect(screen.getByRole('button', { name: t.biometric.notNow })).toBeEnabled();
});
