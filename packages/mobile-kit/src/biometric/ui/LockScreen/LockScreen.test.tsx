import { screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { t } from '../../../lib/i18n/i18n';
import { PROFILE_KEY } from '../../../lib/profile/my-profile';
import { freshQueryClient, renderWithQuery } from '../../../testing/query';
import type { bioLockMock } from '../../../testing/bio-lock';
import { LockScreen } from './LockScreen';

jest.mock(
  '../../core/bio-lock',
  () => jest.requireActual<{ bioLockMock: object }>('../../../testing/bio-lock').bioLockMock,
);
const fake = jest.requireMock<typeof bioLockMock>('../../core/bio-lock');

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const lock = (fullName: string | null) => {
  const client = freshQueryClient();
  client.setQueryData(PROFILE_KEY, { full_name: fullName });
  return renderWithQuery(
    <SafeAreaProvider initialMetrics={metrics}>
      <LockScreen kind="fingerprint" failed={false} />
    </SafeAreaProvider>,
    client,
  );
};

beforeEach(() => fake.reset());

test('greets the user by the first word of the profile name', async () => {
  await lock('  Ahmed Amin ');
  const header = screen.getByRole('header');
  expect(header).toHaveTextContent(t.biometric.greeting.replace('{name}', 'Ahmed'));
});

test('no profile name: no greeting, only the locked hint', async () => {
  await lock(null);
  expect(screen.queryByRole('header')).toBeNull();
  expect(screen.getByText(t.biometric.locked)).toBeTruthy();
});
