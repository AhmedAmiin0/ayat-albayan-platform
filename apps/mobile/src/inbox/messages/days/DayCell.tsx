import { createContext, useContext, useEffect } from 'react';
import { type CellRendererProps, type LayoutRectangle, View } from 'react-native';
import type { DayRow } from './day-separators';

/** Where a cell reports its frame (useDayBand's `frame`); the list provides it. */
export const CellFrames = createContext<(key: string, frame: LayoutRectangle | null) => void>(
  () => undefined,
);

/**
 * The thread's CellRendererComponent: VirtualizedList's own cell wrapper (its style and onLayout
 * kept), that also reports the cell's frame in the content, so the floating day knows where each
 * inline separator is (top-band).
 */
export function DayCell({
  item,
  style,
  onLayout,
  onFocusCapture,
  children,
}: CellRendererProps<DayRow>) {
  const report = useContext(CellFrames);
  // Unmounted by windowing: its frame is stale once newer rows shift the content.
  useEffect(() => () => report(item.id, null), [report, item.id]);
  // The list's own cell passes onFocusCapture to its View too; ViewProps does not type it.
  const focus = { onFocusCapture };
  return (
    <View
      {...focus}
      style={style}
      onLayout={(e) => {
        onLayout?.(e);
        report(item.id, e.nativeEvent.layout);
      }}
    >
      {children}
    </View>
  );
}
