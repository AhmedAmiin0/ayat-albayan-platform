import type { MessageView } from '@ab/shared';
import { useLayoutEffect, useRef, useState } from 'react';
import {
  type LayoutRectangle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { dayLabel } from './day-label';
import { CHIP_BOX, CHIP_MARGIN, chipCovered, type Frame, type Viewport } from './top-band';
import { type Loaded, separatorsOf, topmost } from './day-separators';
import { type } from '@/theme';

type Scroll = NativeSyntheticEvent<NativeScrollEvent>;

interface Live extends Loaded {
  fontScale: number;
  frames: Map<string, Frame>;
  tokens: readonly ViewToken<MessageView>[];
  view: Viewport | null;
  /** The floating chip's measured pill height (0 until it has shown once). */
  chip: number;
}

/** The pill's height before the floating one was measured: DayChip's line, padding and border. */
const chipGuess = (fontScale: number) => type.lineHeight(type.size['2xs']) * fontScale + CHIP_BOX;

/**
 * Whether an inline separator covers the floating day's place (chipCovered, owner 2026-10-27): the
 * cells' frames (DayCell), the rows on screen and the list's offset and length live in a ref,
 * checked on each scroll, layout, viewability and rows change; a re-render only when it flips.
 * `viewable` also gives the topmost row's day (the floating label).
 */
export function useDayBand(rows: readonly MessageView[], more: boolean) {
  const { fontScale } = useWindowDimensions();
  const live = useRef<Live>({
    rows,
    more,
    fontScale,
    frames: new Map(),
    tokens: [],
    view: null,
    chip: 0,
  });
  const [covered, setCovered] = useState(false);
  // The list keeps its first handlers (onViewableItemsChanged above all): stable functions.
  const [band] = useState(() => {
    const check = () => {
      const l = live.current;
      const top = topmost(l.tokens);
      const label = top ? dayLabel(top.created_at) : null;
      const seps = separatorsOf(l, l.tokens);
      setCovered(
        l.view !== null &&
          chipCovered({
            frames: l.frames,
            seps,
            view: l.view,
            chip: l.chip || chipGuess(l.fontScale),
            label,
          }),
      );
    };
    return {
      check,
      viewable(tokens: readonly ViewToken<MessageView>[]): string | null {
        live.current.tokens = tokens;
        check();
        const top = topmost(tokens);
        return top ? dayLabel(top.created_at) : null;
      },
      scroll({ nativeEvent: { contentOffset, layoutMeasurement } }: Scroll) {
        live.current.view = { offset: contentOffset.y, length: layoutMeasurement.height };
        check();
      },
      /** The list's own size (before any scroll, or the keyboard shrinking it at rest). */
      layout({ height }: LayoutRectangle) {
        live.current.view = { offset: live.current.view?.offset ?? 0, length: height };
        check();
      },
      frame(key: string, frame: LayoutRectangle | null) {
        if (frame) live.current.frames.set(key, { y: frame.y, height: frame.height });
        else live.current.frames.delete(key);
        check();
      },
      chip({ height }: LayoutRectangle) {
        live.current.chip = Math.max(0, height - 2 * CHIP_MARGIN);
        check();
      },
    };
  });
  // The rows as they are now, before the next check (the list may report viewability first).
  useLayoutEffect(() => {
    Object.assign(live.current, { rows, more, fontScale });
    band.check();
  }, [band, rows, more, fontScale]);
  return {
    covered,
    viewable: band.viewable,
    scroll: band.scroll,
    layout: band.layout,
    frame: band.frame,
    chip: band.chip,
  };
}
