import { fireEvent, render, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { FLOAT_TOP } from '../top-band';
import { FloatingDay } from './FloatingDay';

const layout = { x: 0, y: 0, width: 80, height: 28 };

test('no day yet: nothing shows', async () => {
  await render(<FloatingDay label={null} opacity={new Animated.Value(1)} />);
  expect(screen.queryByTestId('floating-day')).toBeNull();
});

test('the day chip floats over the top of the list without taking touches', async () => {
  await render(<FloatingDay label="أمس" opacity={new Animated.Value(1)} />);
  const band = screen.getByTestId('floating-day');
  expect(band).toHaveStyle({ position: 'absolute', top: FLOAT_TOP });
  expect(band).toHaveProp('pointerEvents', 'none');
  expect(screen.getByText('أمس')).toBeOnTheScreen();
});

test('reports its measured box so the band follows the system font', async () => {
  const onChip = jest.fn();
  await render(<FloatingDay label="أمس" opacity={new Animated.Value(1)} onChip={onChip} />);
  await fireEvent(screen.getByTestId('floating-day'), 'layout', { nativeEvent: { layout } });
  expect(onChip).toHaveBeenCalledWith(layout);
});

test('without a listener, a layout pass is harmless', async () => {
  await render(<FloatingDay label="أمس" opacity={new Animated.Value(1)} />);
  await fireEvent(screen.getByTestId('floating-day'), 'layout', { nativeEvent: { layout } });
  expect(screen.getByTestId('floating-day')).toBeOnTheScreen();
});
