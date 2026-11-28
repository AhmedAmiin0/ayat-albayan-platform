import { Observe, ObserveRoot } from 'expo-observe';
import Layout, { ErrorBoundary } from '../../app/_layout';
import { CrashScreen } from '@ab/mobile-kit';
import { FamilyRootLayout } from './FamilyRootLayout';

const configure = jest.mocked(Observe.configure);
const wrap = jest.mocked(ObserveRoot.wrap);
const ROUTE_PARAMS = ['id', 'student', 'rec', 'direct'];

test('observe turns the router integration on once, with every route param filtered', () => {
  expect(configure).toHaveBeenCalledTimes(1);
  expect(configure).toHaveBeenCalledWith({
    integrations: { 'expo-router': { filteredParams: ROUTE_PARAMS } },
  });
});

test('observe is configured before the root layout is wrapped', () => {
  const [configured] = configure.mock.invocationCallOrder;
  const [wrapped] = wrap.mock.invocationCallOrder;
  expect(configured).toBeLessThan(wrapped ?? 0);
});

test('the root route is the family layout wrapped by the observe root, crash screen kept', () => {
  expect(wrap).toHaveBeenCalledTimes(1);
  expect(wrap).toHaveBeenCalledWith(FamilyRootLayout);
  expect(Layout).toBe(wrap.mock.results[0]?.value);
  expect(ErrorBoundary).toBe(CrashScreen);
});
