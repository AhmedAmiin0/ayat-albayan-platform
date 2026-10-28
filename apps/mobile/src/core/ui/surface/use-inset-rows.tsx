import { type ReactElement, type ReactNode, useCallback } from 'react';
import { InsetCell, InsetSeparator } from './inset';

/** Any list's renderItem (it may read only `item`): FlatList and FlashList both pass the index too. */
type RenderItem<I> = (info: I) => ReactNode;

/**
 * The container rule for a virtualised list (FlashList through LazyList, or a FlatList): each row in its
 * InsetCell, the first and last rounded by index, InsetSeparator between rows. Rows stay memo: the
 * wrapper only changes when the row count does (the old last row loses its rounded bottom).
 */
export function useInsetRows<I>(render: RenderItem<I> | null | undefined, count: number) {
  const renderItem = useCallback(
    (info: I & { index: number }): ReactElement => (
      <InsetCell place={{ first: info.index === 0, last: info.index === count - 1 }}>{render ? render(info) : null}</InsetCell>
    ),
    [render, count],
  );
  return { renderItem, ItemSeparatorComponent: InsetSeparator };
}
