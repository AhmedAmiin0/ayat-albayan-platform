import { dayTile } from '@ab/client-core';
import { View } from 'react-native';
import { t } from '@ab/mobile-kit';
import { DateTile, PressCard, RowText } from '@/ui';
import type { RecordingRowProps } from './RecordingRow.types';
import { useRecordingRow } from './use-recording-row';

/** One recording (canvas RecXFamilyList): the day, teacher · time · length, where you stopped. */
export function RecordingRow({ row, student, parts }: RecordingRowProps) {
  const { clock, at, line, notes, open } = useRecordingRow({ row, student, parts });
  return (
    <PressCard label={t.lessonFiles.recording} onPress={open}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <DateTile {...dayTile(at, clock)} />
        <RowText title={t.lessonFiles.recording} line={line} notes={notes} />
      </View>
    </PressCard>
  );
}
