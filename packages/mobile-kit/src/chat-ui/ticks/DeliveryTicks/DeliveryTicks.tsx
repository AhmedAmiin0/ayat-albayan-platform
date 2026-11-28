import { Pressable, View } from 'react-native';
import { TickGlyph } from '../TickGlyph';
import type { DeliveryTicksProps } from './DeliveryTicks.types';
import { HIDDEN, holdOf, plain, ROW } from './delivery-ticks.helpers';
import { useDeliveryTicks } from './use-delivery-ticks';

/** Delivered vs read differ by colour only (docs/07 principle 3 carve-out); word goes to a11y. */
export function DeliveryTicks(p: DeliveryTicksProps) {
  const { kind, glyph, a11y } = useDeliveryTicks(p);
  // A tap in a list is the row's tap: no Pressable, and hidden from the reader (the row says it).
  if (p.inList)
    return (
      <View testID={`ticks-${kind}`} style={ROW} {...HIDDEN}>
        <TickGlyph {...glyph} />
      </View>
    );
  if (plain(p))
    return (
      <View {...a11y}>
        <TickGlyph {...glyph} />
      </View>
    );
  // hitSlop 14: the 16pt glyph is a 44pt target.
  return (
    <Pressable {...a11y} hitSlop={14} onPress={p.onPress} onLongPress={holdOf(p)}>
      <TickGlyph {...glyph} />
    </Pressable>
  );
}
