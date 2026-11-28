import type { ViewStyle } from 'react-native';
import type { LazyListProps } from './LazyList.types';
import { gapOf } from './row-gap';

export const FILL: ViewStyle = { flex: 1 };
const HEADER_GAP = { marginBottom: 12 } as const;
// FlashList v2 keeps the first visible row in place on a data change unless told not to: a chat
// that moves to the top of a newest-first list would land above the screen.
export const KEEP_OFF = { disabled: true } as const;

/** The list's own options with their defaults; the rest goes to FlashList. */
export function settle<T>({
  endSpace = 0,
  inset = true,
  tabBar = true,
  gap,
  paged,
  data,
  ...rest
}: LazyListProps<T>) {
  return { endSpace, inset, tabBar, gap, paged, data: data ?? paged?.items, rest };
}

/** The last row clears the floating tab bar (unless the screen already does) and `endSpace`. */
export const endPadding = (tabBar: boolean, bar: number, endSpace: number) => ({
  paddingBottom: tabBar ? 24 + bar + endSpace : endSpace,
});

export const countOf = (rows: readonly unknown[] | null | undefined) => rows?.length ?? 0;

/** Under the header and, for card rows, `gap` between rows; inset rows bring their own rules. */
export function spacing(inset: boolean, gap: number | undefined, header: boolean) {
  if (inset) return { ListHeaderComponentStyle: header ? HEADER_GAP : undefined };
  const style = gap ? { marginBottom: gap } : undefined;
  return {
    ItemSeparatorComponent: gap ? gapOf(gap) : undefined,
    ListHeaderComponentStyle: header ? style : undefined,
  };
}
