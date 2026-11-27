import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';
import { SkeletonCard } from './SkeletonCard';

const reduceMotion = jest.mocked(AccessibilityInfo.isReduceMotionEnabled);
const timing = jest.spyOn(Animated, 'timing');
const loop = jest.spyOn(Animated, 'loop');
const hidden = { includeHiddenElements: true };

async function mount() {
  await render(<SkeletonCard />);
  await act(async () => undefined);
  return screen.getByTestId('skeleton-card', hidden);
}

beforeEach(() => {
  timing.mockClear();
  loop.mockClear();
  reduceMotion.mockResolvedValue(false);
});

test('hidden from screen readers, with an avatar disc and two bars of 60% and 35%', async () => {
  const card = await mount();
  expect(screen.queryByTestId('skeleton-card')).toBeNull();
  expect(card.props.importantForAccessibility).toBe('no-hide-descendants');
  expect(card).toHaveStyle({ flexDirection: 'row', padding: 16, opacity: 1 });
  const widths = JSON.stringify(screen.toJSON()).match(/"width":"\d+%"/g);
  expect(widths).toEqual(['"width":"60%"', '"width":"35%"']);
});

test('breathes 700 ms each way on the native driver', async () => {
  await mount();
  expect(loop).toHaveBeenCalled();
  expect(timing).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ toValue: 1, duration: 700, useNativeDriver: true }),
  );
  expect(timing).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ toValue: 0, duration: 700 }),
  );
});

test('Reduce Motion: the breath stops and the card rests at full opacity', async () => {
  reduceMotion.mockResolvedValue(true);
  const stops: jest.Mock[] = [];
  loop.mockImplementation((animation) => {
    const stop = jest.fn();
    stops.push(stop);
    return { ...animation, start: jest.fn(), stop, reset: jest.fn() };
  });
  const card = await mount();
  expect(card).toHaveStyle({ opacity: 1 });
  expect(stops.length).toBeGreaterThan(0);
  expect(stops.every((stop) => stop.mock.calls.length > 0)).toBe(true);
  loop.mockRestore();
});
