import type { NumberView } from '@ab/shared';
import { View } from 'react-native';
import { Note } from '@/core/ui/feedback/Note';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { checkedLine, healthChip, numberSubtitle, stateChips } from './numbers-words';
import { useClockCycle } from '@/core/lib/clock';

/** One number, read-only: label, role and phone, state chips, last check; the health at the end. */
export function NumberRow({ number }: { number: NumberView }) {
  const cycle = useClockCycle();
  const health = healthChip(number);
  const checked = checkedLine(number, cycle);
  return (
    <ListRow
      title={number.label}
      subtitle={numberSubtitle(number)}
      tags={
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {stateChips(number).map((chip) => (
            <StatusChip key={chip.label} {...chip} size="sm" />
          ))}
          {checked ? <Note>{checked}</Note> : null}
        </View>
      }
      trailing={health ? <StatusChip {...health} size="sm" /> : undefined}
    />
  );
}
