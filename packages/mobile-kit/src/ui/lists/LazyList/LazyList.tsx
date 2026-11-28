import { FlashList } from '@shopify/flash-list';
import { ErrorState } from '../../feedback/ErrorState';
import type { LazyListProps } from './LazyList.types';
import { useLazyList } from './use-lazy-list';

/**
 * Both apps' long list: FlashList v2 (JavaScript only on the New Architecture) recycling rows
 * instead of mounting one per item. Fills the screen inside its gutter with the rows in one inset
 * card, the last row clears the floating tab bar, and the next page is asked for two screens
 * before the end. `paged={usePagedQuery(…)}` wires rows, next page, refresh, footer and error.
 */
export function LazyList<T>(props: LazyListProps<T>) {
  const { failed, retry, ...list } = useLazyList(props);
  return (
    <FlashList
      {...list}
      ListEmptyComponent={failed ? <ErrorState onRetry={retry} /> : list.ListEmptyComponent}
    />
  );
}
