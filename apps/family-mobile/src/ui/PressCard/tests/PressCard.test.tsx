import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';
import { AppText } from '@ab/mobile-kit';
import { PressCard } from '@/ui/PressCard';

// The press: a critically damped spring to 98 % and back on the native driver, interruptible (each
// touch starts a new spring from where the card is); Reduce Motion: the wash alone, no scale.
const spring = jest.spyOn(Animated, 'spring').mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(),
}));
const reduceMotion = jest.mocked(AccessibilityInfo.isReduceMotionEnabled);
const onPress = jest.fn();
const targets = () => spring.mock.calls.map(([, c]) => c.toValue);

async function show() {
  await render(
    <PressCard label="سارة AB-0001" hint="افتح" onPress={onPress}>
      <AppText>سارة</AppText>
    </PressCard>,
  );
  await act(async () => undefined); // Reduce Motion is read asynchronously
  return screen.getByRole('button', { name: 'سارة AB-0001' });
}

afterEach(() => {
  jest.clearAllMocks();
  reduceMotion.mockResolvedValue(false);
});

test('one button: in to 98 % and back out on a critical spring, then it opens', async () => {
  const card = await show();
  await fireEvent(card, 'pressIn');
  await fireEvent(card, 'pressOut');
  expect(targets()).toEqual([0.98, 1]);
  await fireEvent.press(card);
  const [, config] = spring.mock.calls[0] ?? [];
  expect(config).toEqual(expect.objectContaining({ mass: 1, useNativeDriver: true }));
  expect((config?.damping ?? 0) ** 2).toBeCloseTo(4 * (config?.stiffness ?? 0), 6);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('a second touch mid-release takes over: another spring, no reset to 100 %', async () => {
  const card = await show();
  await fireEvent(card, 'pressIn');
  await fireEvent(card, 'pressOut');
  await fireEvent(card, 'pressIn');
  expect(targets()).toEqual([0.98, 1, 0.98]);
});

test('Reduce Motion: the card never scales, the press still opens', async () => {
  reduceMotion.mockResolvedValue(true);
  const card = await show();
  await fireEvent(card, 'pressIn');
  await fireEvent.press(card);
  expect(targets()).not.toContain(0.98);
  expect(onPress).toHaveBeenCalledTimes(1);
});
