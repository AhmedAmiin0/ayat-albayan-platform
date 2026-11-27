import { render, screen } from '@testing-library/react-native';
import { useRootGate } from '../auth/root-gate';
import { connectivity } from '../lib/connectivity/connectivity';
import { queryClient } from '../lib/query/query-client';
import { AppText } from '../ui/primitives/AppText';
import { retryStartup, RootProviders } from './RootProviders';

jest.mock('../auth/gate-retry', () => ({ retryGate: jest.fn() }));
const { retryGate } = jest.requireMock<{ retryGate: jest.Mock }>('../auth/gate-retry');

function Gate() {
  return <AppText>{useRootGate()}</AppText>;
}

test('the screens below read the root gate', async () => {
  await render(
    <RootProviders gate="teacher">
      <Gate />
    </RootProviders>,
  );
  expect(screen.getByText('teacher')).toBeOnTheScreen();
});

test('a retry asks for the session, /auth/me and the connection again', () => {
  const refetch = jest.spyOn(queryClient, 'refetchQueries').mockResolvedValue();
  const probe = jest.spyOn(connectivity, 'probeNow');
  retryStartup();
  expect(retryGate).toHaveBeenCalledTimes(1);
  expect(refetch).toHaveBeenCalledWith({ queryKey: expect.any(Array) });
  expect(probe).toHaveBeenCalledTimes(1);
});
