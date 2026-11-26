import { createContext, use } from 'react';
import { type CellRendererProps, type LayoutRectangle, View } from 'react-native';
import type { ChannelRow } from '@ab/client-core';
import { useFrameGone } from '../use-day-cover';

/** Where a cell reports its frame (useDayCover's `frame`); the list provides it. */
export const CellFrames = createContext<(key: string, frame: LayoutRectangle | null) => void>(
  () => undefined,
);

/**
 * The thread's CellRendererComponent: VirtualizedList's own cell (its style and onLayout kept) that
 * also reports the cell's frame in the content, so the floating day knows where each inline chip
 * is (top-band).
 */
export function ChannelCell({ item, style, onLayout, children }: CellRendererProps<ChannelRow>) {
  const report = use(CellFrames);
  const key = item.message.id;
  useFrameGone(report, key);
  return (
    <View
      style={style}
      onLayout={(e) => {
        onLayout?.(e);
        report(key, e.nativeEvent.layout);
      }}
    >
      {children}
    </View>
  );
}
