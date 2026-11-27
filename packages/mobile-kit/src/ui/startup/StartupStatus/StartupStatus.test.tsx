import { fireEvent, render, screen } from '@testing-library/react-native';
import { Animated, StyleSheet } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { palette, type } from '../../../theme';
import { StartupStatus } from './StartupStatus';
import type { StartupStage } from '../startup-mode';

// The status line and the retry area on their own: what each stage shows and the font gate.
const c = t.mobile.connection;
const onRetry = jest.fn();
const timing = jest.spyOn(Animated, 'timing');
const loaded = (family: string) => family;
const pending = () => undefined;

async function show(stage: StartupStage, font: (family: string) => string | undefined = loaded) {
  await render(<StartupStatus stage={stage} still onRetry={onRetry} font={font} />);
}

beforeEach(() => {
  onRetry.mockClear();
  timing.mockClear();
});

test('the mark stage shows no words but keeps the 112pt retry area reserved', async () => {
  await show('mark');
  expect(screen.queryByText(c.startupConnecting)).toBeNull();
  expect(screen.getByTestId('startup-retry-area')).toHaveStyle({ height: 112, paddingTop: 18 });
  expect(timing).not.toHaveBeenCalled();
});

test('connecting: the words fade in over 200ms in the medium face, no retry yet', async () => {
  await show('connecting');
  expect(screen.getByText(c.startupConnecting)).toHaveStyle({
    fontFamily: type.ui[500],
    color: palette.light.ink3,
  });
  expect(screen.queryByText(c.retry)).toBeNull();
  expect(timing.mock.calls.map(([, config]) => config)).toEqual([
    { toValue: 1, duration: 200, useNativeDriver: true },
  ]);
});

test('retry: the hint and a button that retries, each in its own face', async () => {
  await show('retry');
  expect(screen.getByText(c.checkInternet)).toHaveStyle({ fontFamily: type.ui[400] });
  expect(screen.getByText(c.retry)).toHaveStyle({ fontFamily: type.ui[600] });
  await fireEvent.press(screen.getByRole('button', { name: c.retry }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('before the fonts load every line falls back to the system face', async () => {
  await show('retry', pending);
  const lines = [c.startupConnecting, c.checkInternet, c.retry].map((text) =>
    StyleSheet.flatten(screen.getByText(text).props.style),
  );
  expect(lines.map((style) => Object.hasOwn(style, 'fontFamily'))).toEqual([true, true, true]);
  expect(lines.map((style) => style.fontFamily)).toEqual([undefined, undefined, undefined]);
});
