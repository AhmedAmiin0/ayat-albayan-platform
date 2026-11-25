import { logWarning } from '../../log';
import type * as BootMark from '../boot-mark';

jest.mock('../../log', () => ({ logWarning: jest.fn() }));
jest.mock('../../../http/client-tag', () => ({ mobileClientTag: () => 'mobile/0.7.0' }));

// Each test loads a fresh module: the load mark and the once-per-start flag are module state.
function freshMark(loadedAt: number): typeof BootMark {
  jest.spyOn(performance, 'now').mockReturnValueOnce(loadedAt);
  let mark: typeof BootMark | undefined;
  jest.isolateModules(() => {
    mark = jest.requireActual<typeof BootMark>('../boot-mark');
  });
  if (!mark) throw new Error('boot-mark did not load');
  return mark;
}

beforeEach(() => jest.mocked(logWarning).mockClear());
afterEach(() => jest.restoreAllMocks());

test('the first screen logs the time since load, the restored cache size and the build', () => {
  const mark = freshMark(1_000);
  mark.noteRestoredCache('x'.repeat(1_234));
  jest.spyOn(performance, 'now').mockReturnValueOnce(1_850.4);
  mark.reportFirstScreen();
  expect(logWarning).toHaveBeenCalledTimes(1);
  expect(logWarning).toHaveBeenCalledWith(
    'boot: first screen in 850 ms (cache=1234 chars, mobile/0.7.0)',
  );
});

test('it logs once per start, however often the first screen is reported', () => {
  const mark = freshMark(0);
  mark.reportFirstScreen();
  mark.reportFirstScreen();
  expect(logWarning).toHaveBeenCalledTimes(1);
});

test('only the first cache read counts: later reads are not the restore', () => {
  const mark = freshMark(0);
  mark.noteRestoredCache('abc');
  mark.noteRestoredCache('a much longer value');
  mark.reportFirstScreen();
  expect(logWarning).toHaveBeenCalledWith(expect.stringContaining('cache=3 chars'));
});

test('an empty cache (first install, a new build) reads as 0', () => {
  const mark = freshMark(0);
  mark.noteRestoredCache(null);
  mark.reportFirstScreen();
  expect(logWarning).toHaveBeenCalledWith(expect.stringContaining('cache=0 chars'));
});

test('a first screen before the restore finished says so', () => {
  const mark = freshMark(0);
  mark.reportFirstScreen();
  expect(logWarning).toHaveBeenCalledWith(expect.stringContaining('cache=not restored'));
});
