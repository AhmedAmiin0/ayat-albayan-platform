import { Observe, ObserveRoot } from 'expo-observe';
import { CrashScreen } from '@ab/mobile-kit';
import Layout, { ErrorBoundary } from '../../../../app/_layout';
import { StaffRootLayout } from '@/core/root/StaffRootLayout';

const configure = jest.mocked(Observe.configure);
const wrap = jest.mocked(ObserveRoot.wrap);

test('observe turns the router integration on once, with a filtered param list', () => {
  expect(configure).toHaveBeenCalledTimes(1);
  expect(configure).toHaveBeenCalledWith({
    integrations: { 'expo-router': { filteredParams: expect.arrayContaining(['id']) } },
  });
});

test('observe is configured before the root layout is wrapped', () => {
  const [configured] = configure.mock.invocationCallOrder;
  const [wrapped] = wrap.mock.invocationCallOrder;
  expect(configured).toBeLessThan(wrapped ?? 0);
});

test('the root route is the staff layout wrapped by the observe root, crash screen kept', () => {
  expect(wrap).toHaveBeenCalledTimes(1);
  expect(wrap).toHaveBeenCalledWith(StaffRootLayout);
  expect(Layout).toBe(wrap.mock.results[0]?.value);
  expect(ErrorBoundary).toBe(CrashScreen);
});
