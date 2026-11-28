import { View } from 'react-native';
import { AppText } from '../../../ui/primitives/AppText';
import { DeliveryTicks } from '../../ticks/DeliveryTicks';
import type { BubbleMetaProps } from './BubbleMeta.types';
import { ROW } from './bubble-meta.helpers';
import { useBubbleMeta } from './use-bubble-meta';

/**
 * A bubble's meta row, as WhatsApp: at the inline-end, the ticks right after the time. A long press
 * on the ticks shows their times under the row, so an older message's long times wrap in the
 * bubble.
 */
export function BubbleMeta({ time, ticks, lead, mark, ink }: BubbleMetaProps) {
  const { small, open, setOpen, times } = useBubbleMeta({ ticks, ink });
  return (
    <>
      <View style={ROW}>
        {lead ? <AppText style={small}>{lead}</AppText> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {mark}
          <AppText style={small}>{time}</AppText>
          {ticks ? <DeliveryTicks {...ticks} onLongPress={() => setOpen((v) => !v)} /> : null}
        </View>
      </View>
      {open && times ? (
        <AppText testID="ticks-times" style={{ ...small, alignSelf: 'flex-end' }}>
          {times}
        </AppText>
      ) : null}
    </>
  );
}
