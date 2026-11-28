import { useTabBarInset } from '../../layout/tab-bar-inset';
import { useInsetRows } from '../use-inset-rows';
import { countOf, endPadding, FILL, KEEP_OFF, settle, spacing } from './lazy-list.layout';
import { pagedProps, pagedView } from './lazy-list.paged';
import type { LazyListProps, LazyListView } from './LazyList.types';

export function useLazyList<T>(props: LazyListProps<T>): LazyListView<T> {
  const { endSpace, inset, tabBar, gap, paged, data, rest } = settle(props);
  const bar = useTabBarInset();
  const cells = useInsetRows(rest.renderItem, countOf(data), data);
  return {
    style: FILL,
    contentContainerStyle: endPadding(tabBar, bar, endSpace),
    onEndReachedThreshold: 2,
    maintainVisibleContentPosition: KEEP_OFF,
    ...spacing(inset, gap, rest.ListHeaderComponent != null),
    ...pagedProps(paged),
    ...rest,
    ...(inset ? cells : null),
    ...pagedView(paged, rest),
    data,
  };
}
