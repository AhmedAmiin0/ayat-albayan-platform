import { render, screen } from '@testing-library/react-native';
import { type } from '@/theme';
import { spanStyle, WaText } from './WaText';

const P = { bold: false, italic: false, strike: false, mono: false };

test('each mark has its look; a plain run has none', () => {
  expect(spanStyle({ ...P, text: 'x' })).toBeNull();
  expect(spanStyle({ ...P, bold: true, text: 'x' })).toEqual({ fontFamily: type.ui[700] });
  expect(spanStyle({ ...P, italic: true, strike: true, text: 'x' })).toEqual({
    fontStyle: 'italic',
    textDecorationLine: 'line-through',
  });
  expect(spanStyle({ ...P, bold: true, mono: true, text: 'x' })).toEqual({
    fontFamily: 'monospace',
  });
});

test('a plain text stays one string; a marked one draws its runs', async () => {
  const { rerender } = await render(<WaText testID="t" text="نص عادي" />);
  expect(screen.getByTestId('t').props.children).toBe('نص عادي');
  await rerender(<WaText testID="t" text="أهلًا _بكم_ ~قديم~" />);
  expect(screen.getByText('بكم').props.style).toContainEqual({ fontStyle: 'italic' });
  expect(screen.queryByText(/[_~]/)).toBeNull();
});
