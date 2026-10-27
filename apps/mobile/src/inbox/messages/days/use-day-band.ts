import type { MessageView } from '@ab/shared';
import { useLayoutEffect, useRef, useState } from 'react';
import {
  type LayoutRectangle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { type } from '@/theme';
import { messageGap } from '../hooks/list-gap';
import { dayLabel, hasDayChip } from './day-label';
import { CHIP_MARGIN, chipCovered, type Frame, type Separator, type Viewport } from './top-band';

type Scroll = NativeSyntheticEvent<NativeScrollEvent>;

interface Live {
  rows: readonly MessageView[];
  more: boolean;
  fontScale: number;
  frames: Map<string, Frame>;
  seps: Separator[];
  view: Viewport | null;
  /** The floating chip's measured pill height (0 until it has shown once). */
  chip: number;
  label: string | null;
}

/** The pill's height before the floating one was measured: DayChip's line, padding and border. */
const chipGuess = (fontScale: number) => type.lineHeight(type.size['2xs']) * fontScale + 8;

/** The separator a row on screen carries, if any: its chip's top is its gap and margin down. */
function separatorOf(
  { rows, more }: Pick<Live, 'rows' | 'more'>,
  v: ViewToken<MessageView>,
): Separator[] {
  const index = v.index ?? -1;
  if (index < 0 || rows[index]?.id !== v.item.id || !hasDayChip(rows, index, more)) return [];
  const inset = messageGap(rows[index + 1], v.item) + CHIP_MARGIN;
  return [{ key: v.item.id, label: dayLabel(v.item.created_at), inset }];
}

/**
 * Whether an inline separator covers the floating day's place (chipCovered, owner 2026-10-27): the
 * cells' frames (DayCell), the rows on screen that carry a separator and the scroll offset live in
 * a ref, checked on each scroll, layout and viewability change; a re-render only when it flips.
 * `viewable` also gives the topmost row's day (the floating label).
 */
export function useDayBand(rows: readonly MessageView[], more: boolean) {
  const { fontScale } = useWindowDimensions();
  const live = useRef<Live>({
    rows,
    more,
    fontScale,
    frames: new Map(),
    seps: [],
    view: null,
    chip: 0,
    label: null,
  });
  useLayoutEffect(() => {
    Object.assign(live.current, { rows, more, fontScale });
  });
  const [covered, setCovered] = useState(false);
  // The list keeps its first handlers (onViewableItemsChanged above all): stable functions.
  const [band] = useState(() => {
    const check = () => {
      const { frames, seps, view, chip, label, fontScale: scale } = live.current;
      setCovered(
        view !== null && chipCovered({ frames, seps, view, chip: chip || chipGuess(scale), label }),
      );
    };
    return {
      viewable(items: readonly ViewToken<MessageView>[]): string | null {
        const l = live.current;
        let top: ViewToken<MessageView> | null = null;
        for (const v of items) if ((v.index ?? -1) > (top?.index ?? -1)) top = v;
        l.seps = items.flatMap((v) => separatorOf(l, v));
        if (top) l.label = dayLabel(top.item.created_at);
        check();
        return l.label;
      },
      scroll({ nativeEvent: { contentOffset, layoutMeasurement } }: Scroll) {
        live.current.view = { offset: contentOffset.y, length: layoutMeasurement.height };
        check();
      },
      frame(key: string, { y, height }: LayoutRectangle) {
        live.current.frames.set(key, { y, height });
        check();
      },
      chip({ height }: LayoutRectangle) {
        live.current.chip = Math.max(0, height - 2 * CHIP_MARGIN);
      },
    };
  });
  return { covered, ...band };
}
