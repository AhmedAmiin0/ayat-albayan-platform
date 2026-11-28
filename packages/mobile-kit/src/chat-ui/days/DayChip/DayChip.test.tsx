import { render, screen } from '@testing-library/react-native';
import { palette, shape } from '../../../theme';
import { DayChip } from './DayChip';

test('a centred pill header that reads the day', async () => {
  await render(<DayChip label="اليوم" testID="day" />);
  const chip = screen.getByTestId('day');
  expect(chip).toHaveProp('accessibilityRole', 'header');
  expect(chip).toHaveStyle({
    alignSelf: 'center',
    borderRadius: shape.radius.pill,
    backgroundColor: palette.light.raised,
  });
  expect(screen.getByText('اليوم')).toHaveStyle({ color: palette.light.ink2 });
});
