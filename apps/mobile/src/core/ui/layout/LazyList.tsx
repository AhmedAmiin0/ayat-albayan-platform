import { FlashList, type FlashListProps } from '@shopify/flash-list';
import { type ComponentType, useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTabBarInset } from './tab-bar-inset';

/** Rows run edge to edge: the list bleeds into Screen's 16pt gutter. Margin only: FlashList takes no padding on `style`. */
const BLEED: ViewStyle = { flex: 1, marginHorizontal: -16 };
const FILL: ViewStyle = { flex: 1 };
// FlashList v2 keeps the first visible row in place on a data change unless told not to: a chat that
// moves to the top of a newest-first list would land above the screen. FlatList never did (opt-in).
const KEEP_OFF = { disabled: true } as const;

/** FlashList lays rows out itself (no `gap`): a spacer between rows, one component per size so it stays stable. */
const gaps = new Map<number, ComponentType>();
function gapOf(size: number): ComponentType {
  const known = gaps.get(size);
  if (known) return known;
  const Gap = () => <View style={{ height: size }} />;
  gaps.set(size, Gap);
  return Gap;
}

/** What usePagedList returns for a list: rows, the next page, pull to refresh. */
interface Paged<T> {
  items: readonly T[];
  loadMore: () => void;
  refresh: () => void;
  isRefetching: boolean;
}

interface LazyListProps<T> extends Omit<FlashListProps<T>, 'style' | 'contentContainerStyle' | 'keyExtractor' | 'data'> {
  /** The rows; or `paged` instead. */
  data?: FlashListProps<T>['data'];
  /** A usePagedList result: its items, loadMore at the end, refresh + isRefetching on a pull. */
  paged?: Paged<T>;
  /** Required: a recycled row is matched to its item by key, never by index. */
  keyExtractor: (item: T, index: number) => string;
  /** Space after the last row, on top of the tab bar's clearance (a FAB over the list). */
  endSpace?: number;
  /** false: the list keeps Screen's gutter (cards, a sheet). */
  bleed?: boolean;
  /** false: the Screen (no `list`) or a sheet already stops above the floating tab bar: only `endSpace` at the end. */
  tabBar?: boolean;
  /** Space between rows (and under the header), as a View's `gap`. */
  gap?: number;
}

/**
 * The app's long list (owner 2026-10-27, «for long lazy loaded lists use flash list»): FlashList v2,
 * JS-only on the New Architecture, recycling rows instead of mounting one per item. Defaults: fills the
 * Screen and bleeds into its gutter, the last row clears the floating tab bar, the next page is asked for
 * two screens before the end (FlatList's default); a new top row is not scrolled away. `paged={usePagedList(…)}` wires its rows, next page and pull to refresh;
 * give it an EmptyState / ErrorState as ListEmptyComponent.
 * Rows should be React.memo with stable props, and renderItem a useCallback, or every row redraws.
 */
export function LazyList<T>({ endSpace = 0, bleed = true, tabBar = true, gap, paged, data, ...props }: LazyListProps<T>) {
  const inset = useTabBarInset();
  const end = tabBar ? 24 + inset + endSpace : endSpace;
  const content = useMemo(() => ({ paddingBottom: end }), [end]);
  return (
    <FlashList
      style={bleed ? BLEED : FILL}
      contentContainerStyle={content}
      onEndReachedThreshold={2}
      maintainVisibleContentPosition={KEEP_OFF}
      {...useGap(gap, props.ListHeaderComponent != null)}
      {...pagedProps(paged)}
      {...props}
      data={data ?? paged?.items}
    />
  );
}

/** `gap` between rows, and under the header when there is one. */
function useGap(gap: number | undefined, header: boolean) {
  const style = useMemo(() => (gap ? { marginBottom: gap } : undefined), [gap]);
  return { ItemSeparatorComponent: gap ? gapOf(gap) : undefined, ListHeaderComponentStyle: header ? style : undefined };
}

const pagedProps = <T,>(paged: Paged<T> | undefined) =>
  paged ? { onEndReached: paged.loadMore, onRefresh: paged.refresh, refreshing: paged.isRefetching } : null;
