import { connectivity } from '@/core/lib/connectivity/connectivity';
import { logWarning } from '@/core/lib/log';
import { reportStall } from './stall-report';

// jest.setup.cjs mocks connectivity; the log is mocked here.
jest.mock('@/core/lib/log', () => ({ logWarning: jest.fn() }));

beforeEach(() => jest.mocked(connectivity.reportFailure).mockClear());

test('a token-stage stall (hung refresh) is logged, the API connection is not blamed', () => {
  reportStall('token');
  expect(connectivity.reportFailure).not.toHaveBeenCalled();
  expect(logWarning).toHaveBeenCalledWith(expect.stringContaining('stage=token'));
});

test('a fetch-stage stall (sent, no answer) tells the connection state once per stall', () => {
  reportStall('fetch');
  reportStall('fetch');
  expect(connectivity.reportFailure).toHaveBeenCalledTimes(2);
  expect(logWarning).toHaveBeenCalledWith(expect.stringContaining('stage=fetch'));
});

test('each stage is logged once per app run', () => {
  jest.mocked(logWarning).mockClear();
  reportStall('token');
  reportStall('fetch');
  expect(logWarning).not.toHaveBeenCalled();
});
