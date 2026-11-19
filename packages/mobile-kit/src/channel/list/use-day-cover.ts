import { useEffect, useRef, useState } from 'react';
import {
  type LayoutRectangle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  PixelRatio,
  type ViewToken,
} from 'react-native';
import {
  CHIP_BOX,
  CHIP_MARGIN,
  chipCovered,
  type Frame,
  type Viewport,
} from '../../chat-ui/days/top-band';
import { type } from '../../theme';
import { chipSeparators, topDay } from './day-cover';
import type { ChannelRow } from '@ab/client-core';

type Scroll = NativeSyntheticEvent<NativeScrollEvent>;

interface Live {
  frames: Map<string, Frame>;
  tokens: readonly ViewToken<ChannelRow>[];
  view: Viewport | null;
  /** The floating chip's measured pill height (0 until it has shown once). */
  chip: number;
}

/** The pill's height before the floating one was measured: DayChip's line, padding and border. */
const chipGuess = () => type.lineHeight(type.size['2xs']) * PixelRatio.getFontScale() + CHIP_BOX;

const isCovered = (l: Live): boolean =>
  l.view !== null &&
  chipCovered({
    frames: l.frames,
    seps: chipSeparators(l.tokens),
    view: l.view,
    chip: l.chip || chipGuess(),
    label: topDay(l.tokens),
  });

/**
 * Whether an inline day chip covers the floating one's place (chipCovered, as the staff thread):
 * the cells' frames (ChannelCell), the rows on screen and the list's offset and length live in a
 * ref, checked on each scroll, layout and viewability change; a re-render only when it flips.
 */
export function useDayCover() {
  const live = useRef<Live>({ frames: new Map(), tokens: [], view: null, chip: 0 });
  const [covered, setCovered] = useState(false);
  // The list keeps its first handlers: stable functions.
  const [band] = useState(() => {
    const check = () => setCovered(isCovered(live.current));
    return {
      viewable: (tokens: readonly ViewToken<ChannelRow>[]) => {
        live.current.tokens = tokens;
        check();
      },
      scroll: ({ nativeEvent: { contentOffset, layoutMeasurement } }: Scroll) => {
        live.current.view = { offset: contentOffset.y, length: layoutMeasurement.height };
        check();
      },
      layout: ({ height }: LayoutRectangle) => {
        live.current.view = { offset: live.current.view?.offset ?? 0, length: height };
        check();
      },
      frame: (key: string, frame: LayoutRectangle | null) => {
        const frames = live.current.frames;
        if (frame) frames.set(key, { y: frame.y, height: frame.height });
        else frames.delete(key);
        check();
      },
      chip: ({ height }: LayoutRectangle) => {
        live.current.chip = Math.max(0, height - 2 * CHIP_MARGIN);
        check();
      },
    };
  });
  return { covered, band };
}

/** A cell unmounted by windowing: its frame is stale once newer rows shift the content. */
export function useFrameGone(report: (key: string, frame: null) => void, key: string): void {
  useEffect(() => () => report(key, null), [report, key]);
}
