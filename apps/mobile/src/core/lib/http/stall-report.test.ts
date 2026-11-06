import { connectivity } from '@/core/lib/connectivity/connectivity';
import { logWarning } from '@/core/lib/log';
import type { StallStage } from '@ab/client-core';
import type * as StallReport from './stall-report';

// jest.setup.cjs mocks connectivity; the log is mocked here. Each test loads a fresh module: the
// once-per-run log set starts empty.
jest.mock('@/core/lib/log', () => ({ logWarning: jest.fn() }));

function freshReport(): (stage: StallStage) => void {
  let report: ((stage: StallStage) => void) | undefined;
  jest.isolateModules(() => {
    report = jest.requireActual<typeof StallReport>('./stall-report').reportStall;
  });
  return report ?? (() => undefined);
}

beforeEach(() => {
  jest.mocked(connectivity.reportFailure).mockClear();
  jest.mocked(connectivity.probeNow).mockClear();
  jest.mocked(logWarning).mockClear();
});

test('a token-stage stall (hung refresh): one probe, the API is not blamed, the stage logged', () => {
  freshReport()('token');
  expect(connectivity.reportFailure).not.toHaveBeenCalled();
  expect(connectivity.probeNow).toHaveBeenCalledTimes(1);
  expect(logWarning).toHaveBeenCalledWith(expect.stringContaining('stage=token'));
});

test('a fetch-stage stall (sent, no answer) tells the connection state each time', () => {
  const report = freshReport();
  report('fetch');
  report('fetch');
  expect(connectivity.reportFailure).toHaveBeenCalledTimes(2);
  expect(connectivity.probeNow).not.toHaveBeenCalled();
  expect(logWarning).toHaveBeenCalledWith(expect.stringContaining('stage=fetch'));
});

test('each stage is logged once per app run', () => {
  const report = freshReport();
  report('token');
  report('token');
  report('fetch');
  report('fetch');
  expect(logWarning).toHaveBeenCalledTimes(2);
});
