import { act, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createConnectivity } from '../../../lib/connectivity/connectivity-store';
import { TopConnectingBar } from '../TopConnectingBar';
import { useScreenFocused } from '../use-screen-focus';
import { HeaderConnectingBar } from './HeaderConnectingBar';

// A focused screen header takes the bar from the top slot; an unfocused one leaves it there.
jest.mock('../use-screen-focus', () => ({ useScreenFocused: jest.fn() }));
jest.useFakeTimers();
const focused = jest.mocked(useScreenFocused);
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function connectingStore() {
  const store = createConnectivity({
    probe: () => new Promise(() => undefined),
    setOnline: jest.fn(),
  });
  store.reportFailure();
  jest.advanceTimersByTime(1000);
  return store;
}

interface BothProps {
  store: ReturnType<typeof connectingStore>;
  header: boolean;
}

function Both({ store, header }: BothProps) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <TopConnectingBar store={store} />
      {header ? <HeaderConnectingBar /> : null}
    </SafeAreaProvider>
  );
}

async function mountBoth() {
  const store = connectingStore();
  const view = await render(<Both store={store} header />);
  await act(async () => undefined);
  return { view, store };
}

test('a focused header claims the slot, so the top bar steps aside', async () => {
  focused.mockReturnValue(true);
  await mountBoth();
  expect(screen.queryByTestId('connecting-bar-frame')).toBeNull();
});

test('an unfocused header shows nothing and leaves the bar on top', async () => {
  focused.mockReturnValue(false);
  await mountBoth();
  expect(screen.getAllByTestId('connecting-bar-frame')).toHaveLength(1);
  expect(screen.getByTestId('connecting-bar-frame')).toHaveStyle({ paddingTop: 47 });
});

test('a header that goes away gives the slot back to the top bar', async () => {
  focused.mockReturnValue(true);
  const { view, store } = await mountBoth();
  await view.rerender(<Both store={store} header={false} />);
  await act(async () => undefined);
  expect(screen.getByTestId('connecting-bar')).toBeOnTheScreen();
});
