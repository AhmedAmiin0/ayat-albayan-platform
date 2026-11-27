import { View } from 'react-native';
import type { ButtonRowProps } from './ButtonRow.types';
import { GAP } from './button-row.helpers';
import { useButtonRow } from './use-button-row';

/**
 * docs/07 §6 ButtonRow: peer actions as EQUAL-width buttons filling the row (flex 1, 8pt gap), in
 * reading order (RN mirrors the row in Arabic). When a label would not fit its cell on one line at
 * the phone's font scale, the buttons stack full width instead: never a clipped label.
 */
export function ButtonRow({ children, testID }: ButtonRowProps) {
  const { items, fits, onLayout } = useButtonRow(children);
  if (items.length === 0) return null;
  return (
    <View
      testID={testID}
      onLayout={onLayout}
      style={{ flexDirection: fits ? 'row' : 'column', alignSelf: 'stretch', gap: GAP }}
    >
      {items.map((item, i) => (
        <View
          key={item.key ?? i}
          testID="button-row-cell"
          style={fits ? { flex: 1, minWidth: 0 } : { alignSelf: 'stretch' }}
        >
          {item}
        </View>
      ))}
    </View>
  );
}
