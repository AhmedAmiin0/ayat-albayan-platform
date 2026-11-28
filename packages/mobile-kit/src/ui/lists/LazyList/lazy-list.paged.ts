import type { FlashListProps } from '@shopify/flash-list';
import type { Paged } from '../../../lib/query/paged-query';
import { PagedFooter } from './PagedFooter';

type Own<T> = Pick<FlashListProps<T>, 'ListFooterComponent' | 'ListEmptyComponent'>;
const noop = () => undefined;

export const pagedProps = <T>(paged: Paged<T> | undefined) =>
  paged
    ? { onEndReached: paged.loadMore, onRefresh: paged.refresh, refreshing: paged.pulling }
    : null;

/** A spinner under the last row while the next page loads; no empty state while the first does. */
const slots = <T>(paged: Paged<T> | undefined, own: Own<T>) => ({
  ListFooterComponent: paged?.loadingMore ? PagedFooter : own.ListFooterComponent,
  ListEmptyComponent: paged?.loading ? null : own.ListEmptyComponent,
});

/** A failed read with no rows: the error state, whose retry refreshes. */
const failure = <T>(paged: Paged<T> | undefined) => ({
  failed: paged?.failed === true,
  retry: paged?.refresh ?? noop,
});

/** The paged read's states over the list's own footer and empty state. */
export const pagedView = <T>(paged: Paged<T> | undefined, own: Own<T>) => ({
  ...slots(paged, own),
  ...failure(paged),
});
