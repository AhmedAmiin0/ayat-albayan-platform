import { View } from 'react-native';
import { raisedCard, useTheme } from '@ab/mobile-kit';
import { PressCard } from '@/ui';
import type { HistoryRowProps } from './HistoryRow.types';
import { RowBody } from './RowBody';
import { useHistoryRow } from './use-history-row';

/** One past lesson (canvas Attended / Absent): the day, the time and teacher, its report → open. */
export function HistoryRow({ row, student }: HistoryRowProps) {
  const { color } = useTheme();
  const { clock, fresh, notes, open, title } = useHistoryRow({ row, student });
  if (!open) {
    return (
      <View style={{ ...raisedCard(color, 16), padding: 16 }}>
        <RowBody row={row} clock={clock} title={title} notes={notes} fresh={fresh} />
      </View>
    );
  }
  return (
    <PressCard label={title} onPress={open}>
      <RowBody row={row} clock={clock} title={title} notes={notes} fresh={fresh} />
    </PressCard>
  );
}
