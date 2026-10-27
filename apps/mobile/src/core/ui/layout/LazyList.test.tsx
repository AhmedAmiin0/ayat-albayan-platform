import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { act, render, screen } from '@testing-library/react-native';
import { AppText } from '../primitives/AppText';
import { LazyList } from './LazyList';

interface Row { id: string; name: string }
const rows = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: `r${i}`, name: `صف ${i}` }));
const renderRow = ({ item }: { item: Row }) => <AppText>{item.name}</AppText>;
const keyOf = (r: Row) => r.id;

test('renders its rows (the jest setup gives FlashList a window)', async () => {
  await render(<LazyList testID="lazy" data={rows(3)} keyExtractor={keyOf} renderItem={renderRow} />);
  expect(screen.getByText('صف 0')).toBeTruthy();
  expect(screen.getByText('صف 2')).toBeTruthy();
});

test('reaching the end asks for the next page', async () => {
  const onEndReached = jest.fn();
  await render(<LazyList testID="lazy" data={rows(3)} keyExtractor={keyOf} renderItem={renderRow} onEndReached={onEndReached} />);
  const list = screen.getByTestId('lazy');
  const nativeEvent = { contentOffset: { x: 0, y: 2000 }, contentSize: { width: 400, height: 2300 }, layoutMeasurement: { width: 400, height: 900 } };
  await act(async () => list.props.onScroll({ nativeEvent }));
  expect(onEndReached).toHaveBeenCalled();
});

test('no rows: the empty component', async () => {
  await render(<LazyList data={[] as Row[]} keyExtractor={keyOf} renderItem={renderRow} ListEmptyComponent={<AppText>لا شيء</AppText>} />);
  expect(screen.getByText('لا شيء')).toBeTruthy();
});

test('the last row clears the floating tab bar and a FAB', async () => {
  await render(
    <BottomTabBarHeightContext.Provider value={86}>
      <LazyList testID="lazy" data={rows(1)} keyExtractor={keyOf} renderItem={renderRow} endSpace={72} />
    </BottomTabBarHeightContext.Provider>,
  );
  expect(screen.getByTestId('lazy').props.contentContainerStyle).toEqual(expect.objectContaining({ paddingBottom: 24 + 86 + 72 }));
});

test('paged: a usePagedList result gives the rows, the next page and the pull to refresh', async () => {
  const paged = { items: rows(2), loadMore: jest.fn(), refresh: jest.fn(), isRefetching: false };
  await render(<LazyList testID="lazy" paged={paged} keyExtractor={keyOf} renderItem={renderRow} />);
  expect(screen.getByText('صف 1')).toBeTruthy();
  const list = screen.getByTestId('lazy');
  expect(list.props.refreshControl.props.onRefresh).toBe(paged.refresh);
  const nativeEvent = { contentOffset: { x: 0, y: 2000 }, contentSize: { width: 400, height: 2300 }, layoutMeasurement: { width: 400, height: 900 } };
  await act(async () => list.props.onScroll({ nativeEvent }));
  expect(paged.loadMore).toHaveBeenCalled();
});
