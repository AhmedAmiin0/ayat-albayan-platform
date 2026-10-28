import { render, screen } from '@testing-library/react-native';
import { Button } from '@/core/ui/primitives/Button';
import { copyIcon, openIcon } from './action-icons';

test.each([
  ['انسخ الرابط', copyIcon],
  ['افتح الرابط', openIcon],
])('%s: the icon is decorative, the button keeps its name', async (label, icon) => {
  await render(<Button variant="secondary" label={label} icon={icon} onPress={jest.fn()} />);
  expect(screen.getByRole('button', { name: label })).toBeTruthy();
  expect(screen.getByTestId('button-icon')).toBeTruthy();
});
