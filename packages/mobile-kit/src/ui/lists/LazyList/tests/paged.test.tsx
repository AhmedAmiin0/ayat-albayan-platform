import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../../lib/i18n/i18n';
import type { Paged } from '../../../../lib/query/paged-query';
import { AppText } from '../../../primitives/AppText';
import { LazyList } from '../LazyList';

interface Row {
  id: string;
}
const rows = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: `r${i}` }));
const draw = ({ item }: { item: Row }) => <AppText>{item.id}</AppText>;
const keyOf = (r: Row) => r.id;
const empty = <AppText>لا شيء</AppText>;
const paged = (over: Partial<Paged<Row>> = {}): Paged<Row> => ({
  items: rows(2),
  loadMore: jest.fn(),
  refresh: jest.fn(),
  pulling: false,
  ...over,
});
const list = (p: Paged<Row>) => (
  <LazyList
    testID="lazy"
    paged={p}
    keyExtractor={keyOf}
    renderItem={draw}
    ListEmptyComponent={empty}
  />
);

test('the next page on its way: a spinner under the last row', async () => {
  await render(list(paged({ loadingMore: true })));
  expect(screen.getByTestId('paged-footer')).toBeTruthy();
  expect(screen.getByLabelText(t.common.loading)).toBeTruthy();
});

test('no page loading: no spinner', async () => {
  await render(list(paged()));
  expect(screen.queryByTestId('paged-footer')).toBeNull();
});

test('a failed read with no rows: the error state, and retry refreshes', async () => {
  const p = paged({ items: [], failed: true });
  await render(list(p));
  expect(screen.getByRole('alert')).toHaveTextContent(t.common.error);
  expect(screen.queryByText('لا شيء')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(p.refresh).toHaveBeenCalledTimes(1);
});

test('the first page on its way: no empty state yet; then the empty state', async () => {
  const view = await render(list(paged({ items: [], loading: true })));
  expect(screen.queryByText('لا شيء')).toBeNull();
  await view.rerender(list(paged({ items: [] })));
  expect(screen.getByText('لا شيء')).toBeTruthy();
});

test('a pull refreshes and its spinner follows `pulling`', async () => {
  const p = paged({ pulling: true });
  await render(list(p));
  const control = screen.getByTestId('lazy').props.refreshControl;
  expect(control.props.refreshing).toBe(true);
  await act(async () => control.props.onRefresh());
  expect(p.refresh).toHaveBeenCalledTimes(1);
});
