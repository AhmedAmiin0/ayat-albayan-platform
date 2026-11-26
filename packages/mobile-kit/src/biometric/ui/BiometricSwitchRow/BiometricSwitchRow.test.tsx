import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import type { bioLockMock } from '../../../testing/bio-lock';
import { BiometricSwitchRow } from './BiometricSwitchRow';

jest.mock(
  '../../core/bio-lock',
  () => jest.requireActual<{ bioLockMock: object }>('../../../testing/bio-lock').bioLockMock,
);
const fake = jest.requireMock<typeof bioLockMock>('../../core/bio-lock');

beforeEach(() => fake.reset());

const control = () => screen.getByLabelText(t.biometric.unlock.fingerprint);

test('hidden where the device has no enrolled biometrics (or no module)', async () => {
  fake.auth.isEnrolledAsync.mockResolvedValueOnce(false);
  await fake.boot({ enabled: false });
  await render(<BiometricSwitchRow />);
  expect(screen.queryByTestId('biometric-switch')).toBeNull();
});

test('on asks for one biometric confirmation first, then stays on', async () => {
  await fake.boot({ enabled: false });
  await render(<BiometricSwitchRow />);
  expect(control().props.value).toBe(false);
  await fireEvent(control(), 'valueChange', true);
  expect(fake.auth.authenticateAsync).toHaveBeenCalledTimes(1);
  expect(control().props.value).toBe(true);
});

test('a cancelled confirmation leaves it off', async () => {
  await fake.boot({ enabled: false });
  fake.auth.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
  await render(<BiometricSwitchRow />);
  await fireEvent(control(), 'valueChange', true);
  expect(control().props.value).toBe(false);
});

test('off needs no prompt', async () => {
  await fake.boot({ enabled: false });
  await act(async () => {
    await fake.bioLock.enable();
  });
  fake.auth.authenticateAsync.mockClear();
  await render(<BiometricSwitchRow />);
  await fireEvent(control(), 'valueChange', false);
  expect(control().props.value).toBe(false);
  expect(fake.auth.authenticateAsync).not.toHaveBeenCalled();
});
