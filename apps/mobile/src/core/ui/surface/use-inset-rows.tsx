import { type ReactElement, type ReactNode, useCallback } from 'react';
import { InsetCell, InsetSeparator } from './inset';

/** Any list's renderItem: FlatList's and FlashList's both pass the item's index. */
type RenderItem<I extends { index: number }> = (info: I) => ReactNode;

/**
 * The container rule for a virtualised list (FlashList through LazyList, or a FlatList): each row in its
 * InsetCell, the first and last rounded by index, InsetSeparator between rows. Rows stay memo: the
 * wrapper only changes when the row count does (the old last row loses its rounded bottom).
 */
export function useInsetRows<I extends { index: number }>(render: RenderItem<I> | null | undefined, count: number) {
  const renderItem = useCallback(
    (info: I): ReactElement => (
      <InsetCell place={{ first: info.index === 0, last: info.index === count - 1 }}>{render ? render(info) : null}</InsetCell>
    ),
    [render, count],
  );
  return { renderItem, ItemSeparatorComponent: InsetSeparator };
}
