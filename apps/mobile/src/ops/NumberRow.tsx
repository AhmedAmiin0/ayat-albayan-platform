import type { NumberView } from '@ab/shared';
import { View } from 'react-native';
import { Note } from '@/more/Note';
import { ListRow } from '@/ui/ListRow';
import { StatusChip } from '@/ui/StatusChip';
import { checkedLine, healthChip, numberSubtitle, stateChips } from './numbers-words';

/** One number, read-only: label, role and phone, state chips, last check; the health at the end. */
export function NumberRow({ number }: { number: NumberView }) {
  const health = healthChip(number);
  const checked = checkedLine(number);
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
