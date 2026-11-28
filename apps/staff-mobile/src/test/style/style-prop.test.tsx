import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { styleProp } from './style-prop';

test('reads one prop from a nested style array', async () => {
  await render(<View testID="v" style={[{ flexDirection: 'row' }, [{ alignSelf: 'flex-end' }]]} />);
  expect(styleProp(screen.getByTestId('v'), 'alignSelf')).toBe('flex-end');
  expect(styleProp(screen.getByTestId('v'), 'flexDirection')).toBe('row');
});

test('a node with no style has no value', async () => {
  await render(<View testID="v" />);
  expect(styleProp(screen.getByTestId('v'), 'alignSelf')).toBeUndefined();
});
