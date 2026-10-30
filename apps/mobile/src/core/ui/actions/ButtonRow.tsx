import { Children, isValidElement, useState, type ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { rowFits } from './row-fit';

const GAP = 8;

interface ButtonRowProps {
  /** 2–3 Buttons (null children are dropped); a lone one fills the row. */
  children: ReactNode;
  testID?: string;
}

/** A Button's `label`, or null for a wrapper whose label the row cannot read (estimated). */
function labelOf(node: ReactNode): string | null {
  if (!isValidElement(node)) return null;
  const props = node.props as { label?: unknown };
  return typeof props.label === 'string' ? props.label : null;
}

const hasIcon = (node: ReactNode) => isValidElement(node) && (node.props as { icon?: unknown }).icon !== undefined;

/**
 * docs/07 §6 ButtonRow: peer actions as EQUAL-width buttons filling the row (flex 1, 8pt gap), in
 * reading order (RN mirrors the row in Arabic). When a label would not fit its cell on one line at
 * the phone's font scale, the buttons stack full width instead: never a clipped label.
 */
export function ButtonRow({ children, testID }: ButtonRowProps) {
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const items = Children.toArray(children).filter(isValidElement);
  if (items.length === 0) return null;
  const fits = rowFits({
    width,
    labels: items.map(labelOf),
    fontScale,
    gap: GAP,
    icons: items.filter(hasIcon).length,
  });
  return (
    <View
      testID={testID}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: fits ? 'row' : 'column', alignSelf: 'stretch', gap: GAP }}
    >
      {items.map((item, i) => (
        <View key={item.key ?? i} testID="button-row-cell" style={fits ? { flex: 1, minWidth: 0 } : { alignSelf: 'stretch' }}>
          {item}
        </View>
      ))}
    </View>
  );
}
