import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppText } from '../ui/primitives/AppText';
import { RootFrame } from './RootFrame';

const cover: { view: 'open' | 'maintenance' } = { view: 'open' };
jest.mock('./use-maintenance', () => ({
  useMaintenance: () => ({ view: cover.view, checking: false, retry: jest.fn() }),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

afterEach(() => {
  cover.view = 'open';
});

async function open(ready: boolean) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={new QueryClient()}>
        <RootFrame ready={ready} fontsLoaded>
          <AppText>الشاشة</AppText>
        </RootFrame>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

test('ready and open: the stack mounts and a screen reader reaches it', async () => {
  await open(true);
  expect(screen.getByText('الشاشة')).toBeOnTheScreen();
  expect(screen.queryByTestId('maintenance-screen')).toBeNull();
});

test('not ready: the stack is not mounted yet', async () => {
  await open(false);
  expect(screen.queryByText('الشاشة')).toBeNull();
});

test('under maintenance: the cover lies over a mounted stack hidden from screen readers', async () => {
  cover.view = 'maintenance';
  await open(true);
  expect(screen.getByTestId('maintenance-screen')).toBeOnTheScreen();
  expect(screen.getByText('الشاشة', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.queryByText('الشاشة')).toBeNull();
});
