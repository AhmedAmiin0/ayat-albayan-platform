import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';
import { palette } from '../../theme';
import type { StartupBrand } from './startup-brand';
import { StartupOverlay } from './StartupOverlay';

// The family app's hand-off: the cover materializes into the first screen (scale + opacity on
// one critically damped spring, ~0.35 s); Reduce Motion: a cross-fade. Staff: StartupOverlay.test.
const spring = jest.spyOn(Animated, 'spring');
const timing = jest.spyOn(Animated, 'timing');
const reduceMotion = jest.mocked(AccessibilityInfo.isReduceMotionEnabled);
const { light } = palette;
const tone = { background: light.coverInk, ink: light.leather, accent: light.gold };
const brand: StartupBrand = {
  mark: 1,
  markSize: 160,
  title: 'A',
  subtitle: 'ب',
  tone: { light: tone, dark: tone },
};

async function readyNow() {
  const client = new QueryClient();
  const ui = (ready: boolean) => (
    <QueryClientProvider client={client}>
      <StartupOverlay ready={ready} onRetry={jest.fn()} fontsLoaded brand={brand} />
    </QueryClientProvider>
  );
  await render(ui(false));
  await act(async () => undefined);
  await screen.rerender(ui(true));
}

beforeEach(() => jest.clearAllMocks());

test('ready: one critically damped spring (0.35 s) to 0; the cover grows as it clears', async () => {
  reduceMotion.mockResolvedValue(false);
  await readyNow();
  const [, config] = spring.mock.calls[0] ?? [];
  expect(config).toEqual(expect.objectContaining({ toValue: 0, mass: 1, useNativeDriver: true }));
  expect(config?.stiffness).toBeCloseTo(322.27, 1);
  expect(screen.getByTestId('startup-screen').parent).toHaveStyle({ transform: [{ scale: 1 }] });
});

test('Reduce Motion: a cross-fade, no spring and no scale', async () => {
  reduceMotion.mockResolvedValue(true);
  await readyNow();
  expect(spring).not.toHaveBeenCalled();
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 0 }));
  expect(screen.getByTestId('startup-screen').parent).toHaveStyle({ transform: [] });
});
