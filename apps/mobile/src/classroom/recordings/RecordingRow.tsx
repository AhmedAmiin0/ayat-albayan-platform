import type { LessonRecordingView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { RECORDING_CHIP, recordingTime, type RecordingSource } from './recording-format';
import { playRecording } from './recordings-api';

/** One recording: start time, status chip, and «شغّل» once the file exists (a fresh link on every tap). */
export function RecordingRow({ source, rec }: { source: RecordingSource; rec: LessonRecordingView }) {
  const { color } = useTheme();
  const client = useQueryClient();
  const play = useMutation({ mutationFn: () => playRecording(client, source, rec.id) });
  const time = recordingTime(rec.started_at);
  return (
    <View style={{ gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.rule }}>
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
