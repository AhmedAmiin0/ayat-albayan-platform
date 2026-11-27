import { connectivity } from '../lib/connectivity/connectivity';
import { queryClient } from '../lib/query/query-client';
import { retryStartup } from './retry-startup';

jest.mock('../auth/gate-retry', () => ({ retryGate: jest.fn() }));
const { retryGate } = jest.requireMock<{ retryGate: jest.Mock }>('../auth/gate-retry');

test('a retry asks for the session, /auth/me and the connection again', () => {
  const refetch = jest.spyOn(queryClient, 'refetchQueries').mockResolvedValue();
  const probe = jest.spyOn(connectivity, 'probeNow');
  retryStartup();
  expect(retryGate).toHaveBeenCalledTimes(1);
  expect(refetch).toHaveBeenCalledWith({ queryKey: expect.any(Array) });
  expect(probe).toHaveBeenCalledTimes(1);
});
