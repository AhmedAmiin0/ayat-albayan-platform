import type { MessageView } from '@ab/shared';
import { createContext, useContext } from 'react';
import { type CellRendererProps, type LayoutRectangle, View } from 'react-native';

/** Where a cell reports its frame (useDayBand's `frame`); the list provides it. */
export const CellFrames = createContext<(key: string, frame: LayoutRectangle) => void>(
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
}: CellRendererProps<MessageView>) {
  const report = useContext(CellFrames);
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
