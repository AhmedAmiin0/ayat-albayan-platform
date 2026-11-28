import type { ReactElement, ReactNode } from 'react';
import { InsetCell, InsetSeparator } from '../surface/Inset';

/** Any list's renderItem (it may read only `item`): FlatList and FlashList both pass the index. */
type RenderItem<I> = (info: I) => ReactNode;
interface Cell {
  index: number;
  item?: unknown;
}

const byIndex = (index: number, count: number) => ({
  first: index === 0,
  last: index === count - 1,
});

/**
 * The container rule for a virtualised list: each row in its InsetCell, the first and last rounded,
 * InsetSeparator between rows. With `rows` (LazyList's FlashList) the ends are its first and last
 * item: FlashList redraws a kept item's cell on a new item or renderItem only, never on a new
 * index, so a same-length reorder (a chat moved to the top) would leave the old top row rounded.
 */
export function useInsetRows<I>(
  render: RenderItem<I> | null | undefined,
  count: number,
  rows?: readonly unknown[] | null,
) {
  const head = rows?.[0];
  const tail = rows?.[rows.length - 1];
  const renderItem = (info: I & Cell): ReactElement => {
    const place =
      rows == null
        ? byIndex(info.index, count)
        : { first: info.item === head, last: info.item === tail };
    return <InsetCell place={place}>{render ? render(info) : null}</InsetCell>;
  };
  return { renderItem, ItemSeparatorComponent: InsetSeparator };
}
