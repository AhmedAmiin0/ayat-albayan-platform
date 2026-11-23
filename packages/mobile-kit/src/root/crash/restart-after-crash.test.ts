import { reloadAsync } from 'expo-updates';
import { clearQueryCaches } from '../../lib/query/query-client';
import { restartAfterCrash } from './restart-after-crash';

const mockSteps: string[] = [];
jest.mock('expo-updates', () => ({
  reloadAsync: jest.fn(async () => {
    mockSteps.push('reload');
  }),
}));
jest.mock('../../lib/query/query-client', () => ({
  clearQueryCaches: jest.fn(async () => {
    mockSteps.push('clear');
  }),
}));
jest.mock('../../lib/log/log', () => ({ logWarning: jest.fn() }));

const retry = jest.fn(async () => {
  mockSteps.push('retry');
});

beforeEach(() => {
  mockSteps.length = 0;
  jest.clearAllMocks();
});

test('clears both query caches first, then reloads the bundle', async () => {
  await restartAfterCrash(retry);
  expect(mockSteps).toEqual(['clear', 'reload']);
  expect(retry).not.toHaveBeenCalled();
});

test('a cache that cannot be cleared still reloads', async () => {
  jest.mocked(clearQueryCaches).mockRejectedValueOnce(new Error('storage full'));
  await restartAfterCrash(retry);
  expect(mockSteps).toEqual(['reload']);
});

test('no reload (development build): re-renders the routes with the emptied cache', async () => {
  jest.mocked(reloadAsync).mockRejectedValueOnce(new Error('not supported'));
  await restartAfterCrash(retry);
  expect(mockSteps).toEqual(['clear', 'retry']);
});
