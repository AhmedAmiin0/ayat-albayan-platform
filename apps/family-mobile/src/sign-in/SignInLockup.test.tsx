import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SignInLockup } from './SignInLockup';

test('the staff mushaf mark, unchanged, on the family green tile (canvas LogoGreen)', async () => {
  await render(<SignInLockup />);
  const tile = screen.getByTestId('family-tile');
  expect(StyleSheet.flatten(tile.props.style).backgroundColor).toBe('#064E3B');
  expect(screen.getByTestId('mark-large', { includeHiddenElements: true })).toBeTruthy();
});
