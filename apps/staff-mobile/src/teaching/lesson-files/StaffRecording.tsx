import type { LessonAssetRecording } from '@ab/shared';
import { View } from 'react-native';
import { AppText, AudioPlayer, ErrorLine, SwitchRow, t, type, useTheme } from '@ab/mobile-kit';
import { useRecordingVisibility } from './api';
import { openInPhonePlayer } from './open-in-phone';

const R = t.studentRecordings;
const SHOWN: Readonly<Record<string, string>> = { true: R.visible.on, false: R.visible.off };

interface StaffRecordingProps {
  rec: LessonAssetRecording;
  /** More than one student: the file is every student's session and stays hidden. */
  group: boolean;
}

/** «تسجيل الحلقة» (canvas RecXStaffLessonFiles): state, player, «يراه الطالب وولي الأمر». */
export function StaffRecording({ rec, group }: StaffRecordingProps) {
  const { color } = useTheme();
  const toggle = useRecordingVisibility();
  const done = rec.status === 'done';
  return (
    <View style={{ gap: 8 }}>
      <AppText style={{ fontFamily: type.ui[600], color: color.ink }}>
        {`${t.lessonFiles.recording} · ${R.status[rec.status]}`}
      </AppText>
      {rec.url ? (
        <AudioPlayer id={rec.id} url={rec.url} createSource={openInPhonePlayer} />
      ) : null}
      {done ? (
        <SwitchRow
          label={t.lessonFiles.visible}
          value={rec.visible_to_student}
          disabled={group || toggle.isPending}
          onChange={(visible) => toggle.mutate({ id: rec.id, visible })}
        >
          <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>
            {group ? R.visible.groupLesson : SHOWN[String(rec.visible_to_student)]}
          </AppText>
        </SwitchRow>
      ) : null}
      {toggle.isError ? <ErrorLine message={R.visible.failed} /> : null}
    </View>
  );
}
