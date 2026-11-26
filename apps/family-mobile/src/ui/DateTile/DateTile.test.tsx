import { render, screen } from '@testing-library/react-native';
import { DateTile } from './DateTile';

test('the weekday over its number, plain by default', async () => {
  await render(<DateTile weekday="الإثنين" day="17" />);
  expect(screen.getByText('الإثنين')).toBeTruthy();
  expect(screen.getByText('17')).toBeTruthy();
});

test("today's tile is filled: its words change ink", async () => {
  await render(<DateTile weekday="الثلاثاء" day="18" />);
  const plain = screen.getByText('18').props.style;
  await render(<DateTile weekday="الثلاثاء" day="18" strong />);
  expect(screen.getByText('18').props.style).not.toEqual(plain);
});
