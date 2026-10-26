import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { StartupOverlay } from './StartupOverlay';

// Saved data vs nothing to show, and the hand-off to the real screen.
jest.useFakeTimers();
const c = t.mobile.connection;
const advance = (ms: number) => act(async () => void jest.advanceTimersByTime(ms));

async function open({ saved, ready = false }: { saved: boolean; ready?: boolean }) {
  const client = new QueryClient();
  if (saved) client.setQueryData(['today'], { lessons: [] });
  const ui = (isReady: boolean) => (
    <QueryClientProvider client={client}>
      <StartupOverlay ready={isReady} onRetry={jest.fn()} fontsLoaded />
    </QueryClientProvider>
  );
  await render(ui(ready));
  return { readyNow: () => screen.rerender(ui(true)) };
}

test('nothing saved: the loading screen says «جارٍ الاتصال» at once', async () => {
  await open({ saved: false });
  expect(screen.getByText(c.startupConnecting)).toBeOnTheScreen();
});

test('saved data: only the mark while the app opens on it', async () => {
  await open({ saved: true });
  await advance(1000);
  expect(screen.getByTestId('startup-screen')).toBeOnTheScreen();
  expect(screen.queryByText(c.startupConnecting)).toBeNull();
});

test('ready: it stops taking touches, fades over the screen and leaves', async () => {
  const { readyNow } = await open({ saved: false });
  await readyNow();
  expect(screen.getByTestId('startup-screen').parent).toHaveProp('pointerEvents', 'none');
  await advance(400);
  expect(screen.queryByTestId('startup-screen')).toBeNull();
});

test('not ready again after it left (a sign-in waiting on /auth/me): the cover comes back', async () => {
  const client = new QueryClient();
  const ui = (isReady: boolean) => (
    <QueryClientProvider client={client}>
      <StartupOverlay ready={isReady} onRetry={jest.fn()} fontsLoaded />
    </QueryClientProvider>
  );
  await render(ui(true));
  await advance(400);
  expect(screen.queryByTestId('startup-screen')).toBeNull();
  await screen.rerender(ui(false));
  expect(screen.getByTestId('startup-screen')).toBeOnTheScreen();
  expect(screen.getByText(c.startupConnecting)).toBeOnTheScreen();
});
