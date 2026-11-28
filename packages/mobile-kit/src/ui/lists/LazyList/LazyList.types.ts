import type { FlashListProps } from '@shopify/flash-list';
import type { Paged } from '../../../lib/query/paged-query';

export interface LazyListProps<T> extends Omit<
  FlashListProps<T>,
  'style' | 'contentContainerStyle' | 'keyExtractor' | 'data'
> {
  /** The rows; or `paged` instead. */
  data?: FlashListProps<T>['data'];
  /** A paged read (usePagedQuery): its rows, the next page at the end, pull to refresh. */
  paged?: Paged<T>;
  /** Required: a recycled row is matched to its item by key, never by index. */
  keyExtractor: (item: T, index: number) => string;
  /** Space after the last row, on top of the tab bar's clearance (a FAB over the list). */
  endSpace?: number;
  /** Default: one rounded raised card; false makes each row its own card (pass gap). */
  inset?: boolean;
  /** false: the screen or a sheet already stops above the floating tab bar. */
  tabBar?: boolean;
  /** Space between rows (and under the header), as a View's `gap`. */
  gap?: number;
}

export type LazyListView<T> = FlashListProps<T> & {
  /** The paged read failed with no rows: the error state replaces the empty one. */
  failed: boolean;
  retry: () => void;
};
