import { type ReactElement, type ReactNode, useCallback } from 'react';
import { InsetCell, InsetSeparator } from './inset';

/** Any list's renderItem (it may read only `item`): FlatList and FlashList both pass the index too. */
type RenderItem<I> = (info: I) => ReactNode;

/**
 * The container rule for a virtualised list (FlashList through LazyList, or a FlatList): each row in its
 * InsetCell, the first and last rounded by index, InsetSeparator between rows. Rows stay memo: the
 * wrapper only changes when the row count does (the old last row loses its rounded bottom).
 * `rows` (LazyList's FlashList): the ends are its first and last item, and the wrapper changes when
 * either does. FlashList redraws a kept item's cell on a new item or renderItem only, never on a new
 * index, so a same-length reorder (a chat moved to the top) would leave the old top row rounded.
 */
export function useInsetRows<I>(
  render: RenderItem<I> | null | undefined,
  count: number,
  rows?: readonly unknown[] | null,
) {
  const byItem = rows != null;
  const head = rows?.[0];
  const tail = rows?.[rows.length - 1];
  const renderItem = useCallback(
    (info: I & { index: number; item?: unknown }): ReactElement => {
      const first = byItem ? info.item === head : info.index === 0;
      const last = byItem ? info.item === tail : info.index === count - 1;
      return <InsetCell place={{ first, last }}>{render ? render(info) : null}</InsetCell>;
    },
    [render, count, byItem, head, tail],
  );
  return { renderItem, ItemSeparatorComponent: InsetSeparator };
}
