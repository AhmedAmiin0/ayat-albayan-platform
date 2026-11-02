import type { LessonRecordingView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { RECORDING_CHIP, recordingTime, type RecordingSource } from './recording-format';
import { playRecording } from './recordings-api';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

/**
 * One recording: start time, status chip, and «شغّل» once the file exists (a fresh link on every tap).
 * A row of the list's inset card, which draws the fill and the rules (owner 2026-10-28).
 */
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
