import { act, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createConnectivity } from '@/core/lib/connectivity/connectivity-store';
import { palette } from '@/theme';
import { claimBarSlot } from './bar-slot';
import { TopConnectingBar } from './TopConnectingBar';

// A screen with no header: the bar sits under the top safe area, on the screen's own background.
jest.useFakeTimers();
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

async function mountConnecting() {
  const store = createConnectivity({ probe: () => new Promise(() => undefined), setOnline: jest.fn() });
  store.reportFailure();
  jest.advanceTimersByTime(1000);
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <TopConnectingBar store={store} />
    </SafeAreaProvider>,
  );
  await act(async () => undefined);
}

test('under the top inset, painted with the margin colour', async () => {
  await mountConnecting();
  expect(screen.getByTestId('connecting-bar-frame')).toHaveStyle({ paddingTop: 47, backgroundColor: palette.light.margin });
  expect(screen.getByTestId('connecting-bar')).toBeOnTheScreen();
});

test('steps aside while a focused screen header shows the bar', async () => {
  const release = claimBarSlot();
  await mountConnecting();
  expect(screen.queryByTestId('connecting-bar-frame')).toBeNull();
  await act(async () => release());
  expect(screen.getByTestId('connecting-bar')).toBeOnTheScreen();
});
