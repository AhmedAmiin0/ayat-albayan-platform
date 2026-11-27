import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { WeekNav } from './WeekNav';

const S = t.portal.app.schedule;
const onChange = jest.fn();
const show = (offset: number) =>
  render(<WeekNav offset={offset} range="16 – 22 نوفمبر" onChange={onChange} />);

beforeEach(() => onChange.mockClear());

test('this week: its title and range; back is off, next moves one week on', async () => {
  await show(0);
  expect(screen.getByText(S.thisWeek)).toBeTruthy();
  expect(screen.getByText('16 – 22 نوفمبر')).toBeTruthy();
  expect(screen.getByRole('button', { name: S.prev })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: S.next }));
  expect(onChange).toHaveBeenCalledWith(1);
});

test('next week goes back one; the last week the API covers stops next', async () => {
  await show(1);
  expect(screen.getByText(S.nextWeek)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: S.prev }));
  expect(onChange).toHaveBeenCalledWith(0);
  await show(2);
  expect(screen.getByText(S.laterWeek)).toBeTruthy();
  expect(screen.getByRole('button', { name: S.next })).toBeDisabled();
});

test('a week past the titles has no title', async () => {
  await show(3);
  expect(screen.queryByText(S.laterWeek)).toBeNull();
});
