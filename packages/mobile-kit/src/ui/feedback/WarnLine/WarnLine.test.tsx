import { render, screen } from '@testing-library/react-native';
import { WarnLine } from './WarnLine';

test('a warning beside a pick: its text, read by the screen reader', async () => {
  await render(<WarnLine message="خارج الأوقات" />);
  expect(screen.getByText('خارج الأوقات')).toBeTruthy();
  expect(screen.getByRole('text', { name: 'خارج الأوقات' })).toBeTruthy();
});
