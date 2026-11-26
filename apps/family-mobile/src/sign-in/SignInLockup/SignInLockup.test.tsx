import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { palette } from '@ab/mobile-kit';
import { SignInLockup } from './SignInLockup';

test('the staff mushaf mark, unchanged, on the family green tile (canvas LogoGreen)', async () => {
  await render(<SignInLockup />);
  const tile = screen.getByTestId('family-tile');
  expect(StyleSheet.flatten(tile.props.style).backgroundColor).toBe(palette.light.brandTile);
  expect(screen.getByTestId('mark-large', { includeHiddenElements: true })).toBeTruthy();
});
