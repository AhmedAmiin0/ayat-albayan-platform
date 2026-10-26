import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@/theme';
import { StartupScreen } from './StartupScreen';

// The branded wait: the status from the start, the 10 s hint and retry in a reserved space, Reduce Motion.
jest.useFakeTimers();
const reduceMotion = jest.mocked(AccessibilityInfo.isReduceMotionEnabled);
const loop = jest.spyOn(Animated, 'loop');
const c = t.mobile.connection;
const onRetry = jest.fn();
const advance = (ms: number) => act(async () => void jest.advanceTimersByTime(ms));
const retryButton = () => screen.queryByRole('button', { name: c.retry });

async function open(mode: 'quiet' | 'loading' = 'loading') {
  await render(<StartupScreen mode={mode} onRetry={onRetry} fontsLoaded />);
  await act(async () => undefined); // Reduce Motion is read asynchronously
}

beforeEach(() => {
  loop.mockClear();
  onRetry.mockClear();
  reduceMotion.mockResolvedValue(false);
});

test('cover background, 32 pt sides; the title 22 / 33 in cover ink, 32 pt under the emblem', async () => {
  await open();
  expect(screen.getByTestId('startup-screen')).toHaveStyle({ backgroundColor: palette.light.cover, paddingHorizontal: 32, justifyContent: 'center' });
  expect(screen.getByText(t.app.name)).toHaveStyle({ marginTop: 32, fontSize: 22, lineHeight: 33, color: palette.light.coverInk });
  expect(screen.getByLabelText(`${t.app.name} — ${c.loading}`)).toBeOnTheScreen();
});

test('«جارٍ الاتصال» (15 / 24 ink-3, polite) with the gold dots from the first frame; the hint and retry at 10 s', async () => {
  await open();
  expect(screen.getByText(c.startupConnecting)).toHaveStyle({ fontSize: 15, lineHeight: 24, color: palette.light.ink3 });
  expect(screen.getByLabelText(c.startupConnecting)).toHaveProp('accessibilityLiveRegion', 'polite');
  expect(screen.getAllByTestId('connecting-dot', { includeHiddenElements: true })[0]).toHaveStyle({ backgroundColor: palette.light.gold });
  expect(screen.getByTestId('startup-retry-area')).toHaveStyle({ height: 112, paddingTop: 18 });
  await advance(9999);
  expect(retryButton()).toBeNull();
  expect(screen.queryByText(c.checkInternet)).toBeNull();
  await advance(1);
  expect(screen.getByText(c.checkInternet)).toHaveStyle({ fontSize: 14, lineHeight: 22, color: palette.light.ink3 });
  expect(retryButton()).toHaveStyle({ height: 48, paddingHorizontal: 28, borderRadius: 12, backgroundColor: palette.light.lapisFill });
  expect(screen.getByText(c.retry)).toHaveStyle({ fontSize: 16, color: palette.light.onLapis });
});

test('a retry probes at once and waits another 10 s before offering it again', async () => {
  await open();
  await advance(10_000);
  const button = retryButton();
  if (!button) throw new Error('no retry');
  await fireEvent.press(button);
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(retryButton()).toBeNull();
  expect(screen.getByText(c.startupConnecting)).toBeOnTheScreen();
  await advance(10_000);
  expect(retryButton()).toBeOnTheScreen();
});

test('quiet (saved data coming): the emblem alone until 3 s', async () => {
  await open('quiet');
  await advance(2999);
  expect(screen.queryByText(c.startupConnecting)).toBeNull();
  await advance(1);
  expect(screen.getByText(c.startupConnecting)).toBeOnTheScreen();
});

test('Reduce Motion: no ring turn, breath or dot wave; the words and the retry still come', async () => {
  reduceMotion.mockResolvedValue(true);
  await open();
  loop.mockClear();
  await advance(10_000);
  expect(loop).not.toHaveBeenCalled();
  for (const dot of screen.getAllByTestId('connecting-dot', { includeHiddenElements: true })) expect(dot).toHaveStyle({ opacity: 0.7 });
  expect(retryButton()).toBeOnTheScreen();
});
