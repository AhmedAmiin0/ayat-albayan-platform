import { fireEvent, render, screen } from '@testing-library/react-native';
import { AppText, t } from '@ab/mobile-kit';
import { LoadState } from './LoadState';

const refetch = jest.fn();
const show = (data: string | undefined, isError: boolean) =>
  render(<LoadState query={{ data, isError, refetch }}>{(d) => <AppText>{d}</AppText>}</LoadState>);

beforeEach(() => refetch.mockClear());

test('loading: neither the content nor the retry', async () => {
  await show(undefined, false);
  expect(screen.queryByText('ready')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
});

test('failed with nothing cached: the retry reads again', async () => {
  await show(undefined, true);
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(refetch).toHaveBeenCalledTimes(1);
});

test('cached data wins over a failed refetch', async () => {
  await show('ready', true);
  expect(screen.getByText('ready')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});
