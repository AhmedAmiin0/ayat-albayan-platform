import { render, screen } from '@testing-library/react-native';
import { shape } from '../../../../theme';
import { ExpoHostShowcase } from '../ExpoHost.showcase';

test('the showcase: an Arabic host and an LTR one, each with a 44pt named button', async () => {
  await render(<ExpoHostShowcase />);
  expect(screen.getByTestId('showcase-rtl').props.layoutDirection).toBeDefined();
  expect(screen.getByTestId('showcase-ltr').props.layoutDirection).toBe('leftToRight');
  const buttons = screen.getAllByRole('button');
  expect(buttons).toHaveLength(2);
  expect(shape.control.comfort).toBeGreaterThanOrEqual(44);
  buttons.forEach((b) => expect(b).toHaveStyle({ minHeight: shape.control.comfort }));
});
