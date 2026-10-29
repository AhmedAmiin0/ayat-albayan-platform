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
  const paged = { items: rows(2), loadMore: jest.fn(), refresh: jest.fn(), pulling: false };
  await render(<LazyList testID="lazy" paged={paged} keyExtractor={keyOf} renderItem={renderRow} />);
  expect(screen.getByText('صف 1')).toBeTruthy();
  const list = screen.getByTestId('lazy');
  expect(list.props.refreshControl.props.onRefresh).toBe(paged.refresh);
  const nativeEvent = { contentOffset: { x: 0, y: 2000 }, contentSize: { width: 400, height: 2300 }, layoutMeasurement: { width: 400, height: 900 } };
  await act(async () => list.props.onScroll({ nativeEvent }));
  expect(paged.loadMore).toHaveBeenCalled();
});

test('a new top row is not scrolled away (FlashList v2 keeps position by default; FlatList did not)', async () => {
  await render(<LazyList testID="lazy" data={rows(2)} keyExtractor={keyOf} renderItem={renderRow} />);
  expect(screen.getByTestId('lazy').props.maintainVisibleContentPosition).toBeUndefined();
});

// Owner 2026-10-28: one container rule, every list's rows in ONE rounded card inside the gutter.
test('inset (default): rows sit in one card, the first rounds the top and the last the bottom', async () => {
  await render(<LazyList testID="lazy" data={rows(3)} keyExtractor={keyOf} renderItem={renderRow} />);
  expect(screen.getByTestId('lazy')).not.toHaveStyle({ marginHorizontal: -16 });
  const [first, middle, last] = screen.getAllByTestId('inset-cell');
  expect(first).toHaveStyle({ borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 0 });
  expect(middle).toHaveStyle({ borderTopLeftRadius: 0, borderBottomRightRadius: 0 });
  expect(last).toHaveStyle({ borderTopRightRadius: 0, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 });
});

test('one row rounds both ends; inset={false} leaves rows as they are (cards with a gap)', async () => {
  await render(<LazyList data={rows(1)} keyExtractor={keyOf} renderItem={renderRow} />);
  expect(screen.getByTestId('inset-cell')).toHaveStyle({ borderTopLeftRadius: 20, borderBottomRightRadius: 20 });
  await render(<LazyList data={rows(2)} keyExtractor={keyOf} renderItem={renderRow} inset={false} gap={8} />);
  expect(screen.queryByTestId('inset-cell')).toBeNull();
});
