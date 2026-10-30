import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { SearchField } from './SearchField';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('16pt input named «بحث»', async () => {
  await render(<SearchField onSearch={jest.fn()} />);
  expect(screen.getByLabelText(t.common.search)).toHaveStyle({ fontSize: 16, minHeight: 44 });
});

test('compact: a 44pt grey pill with a hairline edge, still 16pt text', async () => {
  await render(<SearchField onSearch={jest.fn()} compact />);
  const input = screen.getByLabelText(t.common.search);
  expect(input).toHaveStyle({ fontSize: 16, minHeight: 44, borderRadius: 999 });
  expect(input).not.toHaveStyle({ borderWidth: 1 });
  expect(input).toHaveStyle({ backgroundColor: 'rgba(120, 120, 128, 0.14)' });
});

test('waits for a pause, then sends the trimmed text once', async () => {
  const onSearch = jest.fn();
  await render(<SearchField onSearch={onSearch} />);
  const input = screen.getByLabelText(t.common.search);
  await fireEvent.changeText(input, 'سه');
  await act(async () => jest.advanceTimersByTime(200));
  await fireEvent.changeText(input, ' سهيلة ');
  await act(async () => jest.advanceTimersByTime(299));
  expect(onSearch).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(1));
  expect(onSearch).toHaveBeenCalledTimes(1);
  expect(onSearch).toHaveBeenCalledWith('سهيلة');
});

test('the keyboard search key sends at once, without a second call later', async () => {
  const onSearch = jest.fn();
  await render(<SearchField onSearch={onSearch} initial="AB-01" />);
  const input = screen.getByLabelText(t.common.search);
  await fireEvent.changeText(input, 'AB-0183');
  await fireEvent(input, 'submitEditing');
  expect(onSearch).toHaveBeenCalledWith('AB-0183');
  await act(async () => jest.advanceTimersByTime(1000));
  expect(onSearch).toHaveBeenCalledTimes(1);
});

test('no search on mount, none after unmount', async () => {
  const onSearch = jest.fn();
  const { unmount } = await render(<SearchField onSearch={onSearch} initial="x" />);
  await fireEvent.changeText(screen.getByLabelText(t.common.search), 'xy');
  await unmount();
  await act(async () => jest.advanceTimersByTime(1000));
  expect(onSearch).not.toHaveBeenCalled();
});
