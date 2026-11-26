import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Animated, Pressable } from 'react-native';
import { AppText } from '../../primitives/AppText';
import { StepStage } from './StepStage';
import { useStepMotion } from '../use-step-motion';

// docs/50 §5 «Motion»: steps move on a critically damped spring (Reduce Motion: a cross-fade), the
// leaving step goes out the way the new one came in, and going back mid-move is fine.
jest.useFakeTimers(); // nothing settles unless a test moves the clock
const spring = jest.spyOn(Animated, 'spring');
const timing = jest.spyOn(Animated, 'timing');
const hidden = { includeHiddenElements: true };

function Harness({ still }: { still: boolean }) {
  const motion = useStepMotion<'one' | 'two'>('one', still);
  return (
    <>
      <StepStage motion={motion} still={still} render={(step) => <AppText>{step}</AppText>} />
      <Pressable accessibilityRole="button" onPress={() => motion.go('two')}>
        <AppText>next</AppText>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => motion.go('one', 'back')}>
        <AppText>back</AppText>
      </Pressable>
    </>
  );
}

beforeEach(() => jest.clearAllMocks());

test('at rest: one step, nothing leaving', async () => {
  await render(<Harness still={false} />);
  expect(screen.getByText('one')).toBeOnTheScreen();
  expect(screen.queryByTestId('step-leaving', hidden)).toBeNull();
});

test('forward: the new step comes in on a critical spring, the old one leaves hidden', async () => {
  await render(<Harness still={false} />);
  await fireEvent.press(screen.getByText('next'));
  expect(screen.getByText('two')).toBeOnTheScreen();
  expect(screen.getByTestId('step-leaving', hidden)).toHaveProp('pointerEvents', 'none');
  expect(screen.queryByText('one')).toBeNull();
  const [, config] = spring.mock.calls[0] ?? [];
  expect(config).toEqual(expect.objectContaining({ toValue: 1, mass: 1 }));
  expect((config?.damping ?? 0) ** 2).toBeCloseTo(4 * (config?.stiffness ?? 0), 6);
});

test('back mid-move: the first step returns, the second leaves', async () => {
  await render(<Harness still={false} />);
  await fireEvent.press(screen.getByText('next'));
  await act(async () => {
    jest.advanceTimersByTime(80); // part of the way in
  });
  await fireEvent.press(screen.getByText('back'));
  expect(screen.getByText('one')).toBeOnTheScreen();
  expect(screen.getByTestId('step-leaving', hidden)).toHaveTextContent('two');
});

test('Reduce Motion: a cross-fade (timing, no slide); the old step is gone once it settles', async () => {
  await render(<Harness still />);
  await fireEvent.press(screen.getByText('next'));
  expect(spring).not.toHaveBeenCalled();
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 1 }));
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(screen.queryByTestId('step-leaving', hidden)).toBeNull();
});

test('the height follows the step on screen, also one that comes back mid-move', async () => {
  const layout = (text: string, height: number) =>
    fireEvent(screen.getByText(text, hidden).parent ?? screen.getByText(text), 'layout', {
      nativeEvent: { layout: { height } },
    });
  await render(<Harness still={false} />);
  await layout('one', 100);
  expect(screen.getByTestId('step-stage')).toHaveStyle({ height: 100 });
  await fireEvent.press(screen.getByText('next'));
  await layout('two', 200);
  const heights = () => spring.mock.calls.map(([, c]) => c.toValue).filter((v) => v !== 1);
  expect(heights().at(-1)).toBe(200);
  await act(async () => {
    jest.advanceTimersByTime(80);
  });
  await fireEvent.press(screen.getByText('back'));
  expect(heights().at(-1)).toBe(100);
});
