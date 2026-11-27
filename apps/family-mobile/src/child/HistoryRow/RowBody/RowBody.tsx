import { dayTile } from '@ab/client-core';
import { View } from 'react-native';
import { DateTile, NewMark, RowText } from '@/ui';
import { rangeText, teacherText } from '@/lessons';
import type { RowBodyProps } from './RowBody.types';

/** The day, the headline, the time and teacher with its notes, and the new mark. */
export function RowBody({ row, clock, title, notes, fresh }: RowBodyProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <DateTile {...dayTile(new Date(row.starts_at), clock)} />
      <RowText
        title={title}
        line={`${rangeText(row, clock)} · ${teacherText(row.teacher)}`}
        notes={notes}
      />
      {fresh ? <NewMark /> : null}
    </View>
  );
}
