import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { palette } from '../../../theme';
import { RecDot } from './RecDot';

test('the recording dot: 10pt, in the danger colour', async () => {
  await render(<RecDot />);
  const dot = StyleSheet.flatten(screen.getByTestId('rec-dot').props.style);
  expect(dot).toMatchObject({ width: 10, height: 10, backgroundColor: palette.light.bad });
});
