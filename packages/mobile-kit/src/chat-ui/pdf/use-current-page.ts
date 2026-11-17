import { useState } from 'react';
import type { ViewToken } from 'react-native';
import { palette, type } from '../../theme';

/** The viewer's small print, light on black. */
export const PDF_LINE = {
  fontFamily: type.ui[500],
  fontSize: type.size['2xs'],
  lineHeight: type.lineHeight(type.size['2xs']),
  color: palette.dark.ink2,
};

/**
 * The page in view: the first one at least half on screen (a fixed object: FlatList refuses a new
 * one).
 */
const VIEWABLE = { itemVisiblePercentThreshold: 50 };

/**
 * The PDF viewer's page in view. The handler is the same function for the list's whole life (a new
 * one on a render would throw): a state's first value, never read from a ref during render.
 */
export function useCurrentPage() {
  const [current, setCurrent] = useState(1);
  const [onViewable] = useState(
    () =>
      ({ viewableItems }: { viewableItems: ViewToken<number>[] }) => {
        const shown = viewableItems[0]?.item;
        if (typeof shown === 'number') setCurrent(shown);
      },
  );
  return { current, onViewable, viewability: VIEWABLE };
}
