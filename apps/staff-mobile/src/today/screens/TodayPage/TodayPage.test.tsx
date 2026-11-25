import { render, screen } from '@testing-library/react-native';
import { AppText } from '@ab/mobile-kit';
import { TodayPage } from './TodayPage';

const header = <AppText>بطاقات اليوم</AppText>;

test("the page is the list's one row", async () => {
  await render(<TodayPage header={header} refreshing={false} onRefresh={jest.fn()} />);
  expect(screen.getByText('بطاقات اليوم')).toBeTruthy();
});

test('a pull asks for the day again; a running refetch shows the spinner', async () => {
  const onRefresh = jest.fn();
  await render(<TodayPage header={header} refreshing onRefresh={onRefresh} />);
  const pull = screen.getByTestId('today-list').props.refreshControl;
  expect(pull.props.refreshing).toBe(true);
  await pull.props.onRefresh();
  expect(onRefresh).toHaveBeenCalledTimes(1);
});
