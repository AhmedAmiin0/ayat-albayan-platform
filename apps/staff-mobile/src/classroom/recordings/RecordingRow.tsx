import type { LessonRecordingView } from '@ab/schedule';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { t, type, useTheme, AppText, Button, StatusChip, ErrorLine } from '@ab/mobile-kit';
import { RECORDING_CHIP, recordingTime, type RecordingSource } from './recording-format';
import { playRecording } from './recordings-api';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

/** A fresh link on every tap. */
export function RecordingRow({ source, rec }: { source: RecordingSource; rec: LessonRecordingView }) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const { color } = useTheme();
  const client = useQueryClient();
  const play = useMutation({ mutationFn: () => playRecording(client, source, rec.id) });
  const time = recordingTime(rec.started_at, cycle, tz);
  return (
    <View style={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <AppText style={{ flex: 1, fontFamily: type.ui[600], fontSize: type.size.body, color: color.ink, fontVariant: ['tabular-nums'] }}>
          {time}
        </AppText>
        <StatusChip {...RECORDING_CHIP[rec.status]} label={t.classroom.recordings.status[rec.status]} size="sm" />
      </View>
      {rec.status === 'done' ? (
        <Button
          variant="secondary"
          label={t.mobileClassroom.play}
          accessibilityLabel={t.mobileClassroom.playOf.replace('{time}', time)}
          busy={play.isPending}
          onPress={() => play.mutate()}
        />
      ) : null}
      {play.isError ? <ErrorLine message={t.mobileClassroom.playFailed} /> : null}
    </View>
  );
}
