import { FlashList, type FlashListProps } from '@shopify/flash-list';
import { type ComponentType, useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTabBarInset } from '../layout/tab-bar-inset';
import { useInsetRows } from '../surface/use-inset-rows';

/** Inside Screen's 16pt gutter, on the screen's own margin colour (owner 2026-10-28: one container rule). */
const FILL: ViewStyle = { flex: 1 };
/** Between the list's header (totals, a hint) and the rows' card. */
const HEADER_GAP = { marginBottom: 12 } as const;
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
  /** The viewer's own pull is running: the only thing that shows the spinner (never a background refetch). */
  pulling: boolean;
}

interface LazyListProps<T> extends Omit<FlashListProps<T>, 'style' | 'contentContainerStyle' | 'keyExtractor' | 'data'> {
  /** The rows; or `paged` instead. */
  data?: FlashListProps<T>['data'];
  /** A usePagedList result: its items, loadMore at the end, refresh + pulling on a pull. */
  paged?: Paged<T>;
  /** Required: a recycled row is matched to its item by key, never by index. */
  keyExtractor: (item: T, index: number) => string;
  /** Space after the last row, on top of the tab bar's clearance (a FAB over the list). */
  endSpace?: number;
  /**
   * The container rule (default): the rows sit in ONE rounded raised card, as Today's «بقية اليوم»,
   * the first and last rounded, an inset rule between them. false: each row is its own card (pass `gap`).
   */
  inset?: boolean;
  /** false: the Screen (no `list`) or a sheet already stops above the floating tab bar: only `endSpace` at the end. */
  tabBar?: boolean;
  /** Space between rows (and under the header), as a View's `gap`. */
  gap?: number;
}

/**
 * The app's long list (owner 2026-10-27, «for long lazy loaded lists use flash list»): FlashList v2,
 * JS-only on the New Architecture, recycling rows instead of mounting one per item. Defaults: fills the
 * Screen inside its gutter with the rows in one inset card, the last row clears the floating tab bar, the next page is asked for
 * two screens before the end (FlatList's default); a new top row is not scrolled away. `paged={usePagedList(…)}` wires its rows, next page and pull to refresh;
 * give it an EmptyState / ErrorState as ListEmptyComponent.
 * Rows should be React.memo with stable props, and renderItem a useCallback, or every row redraws.
 */
export function LazyList<T>({ endSpace = 0, inset = true, tabBar = true, gap, paged, data, ...props }: LazyListProps<T>) {
  const bar = useTabBarInset();
  const end = tabBar ? 24 + bar + endSpace : endSpace;
  const content = useMemo(() => ({ paddingBottom: end }), [end]);
  const rows = data ?? paged?.items;
  const cells = useInsetRows(props.renderItem, rows?.length ?? 0, rows);
  return (
    <FlashList
      style={FILL}
      contentContainerStyle={content}
      onEndReachedThreshold={2}
      maintainVisibleContentPosition={KEEP_OFF}
      {...spacing(inset, gap, props.ListHeaderComponent != null)}
      {...pagedProps(paged)}
      {...props}
      {...(inset ? cells : null)}
      data={rows}
    />
  );
}

/** Under the header (when there is one) and, for card rows, `gap` between rows; inset rows bring their own rules. */
function spacing(inset: boolean, gap: number | undefined, header: boolean) {
  if (inset) return { ListHeaderComponentStyle: header ? HEADER_GAP : undefined };
  const style = gap ? { marginBottom: gap } : undefined;
  return { ItemSeparatorComponent: gap ? gapOf(gap) : undefined, ListHeaderComponentStyle: header ? style : undefined };
}

const pagedProps = <T,>(paged: Paged<T> | undefined) =>
  paged ? { onEndReached: paged.loadMore, onRefresh: paged.refresh, refreshing: paged.pulling } : null;
