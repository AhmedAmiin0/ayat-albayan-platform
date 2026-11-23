import type { LessonView, TimeEditMode } from '@ab/shared';
import { View } from 'react-native';
import { t, type, useTheme, AppText, whenText } from '@ab/mobile-kit';
import { studentNames } from '@/today';
import { lengthOf } from '@/edit-time/lib/edit-time-body';
import { lengthText } from '@/edit-time/lib/edit-time-text';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

interface EditTimeHeaderProps {
  lesson: LessonView;
  mode: TimeEditMode;
  /** The family's zone, for the student's clock. */
  tz: string;
}

/** Shows the current length so a migrated odd-length lesson still reads right. */
export function EditTimeHeader({ lesson, mode, tz }: EditTimeHeaderProps) {
  const cycle = useClockCycle();
  const viewerZone = useViewerTz();
  const viewer = { tz: viewerZone, cycle };
  const { color } = useTheme();
  const text = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  return (
    <View style={{ gap: 2 }}>
      <AppText style={{ ...text, fontFamily: type.ui[700], fontSize: type.size.body, color: color.ink }}>
        {studentNames(lesson)}
      </AppText>
      <AppText style={text}>{t.reschedule.current.replace('{when}', whenText(lesson.starts_at, tz, viewer))}</AppText>
      <AppText style={text}>{t.editTime.currentLength.replace('{len}', lengthText(lengthOf(lesson)))}</AppText>
      {mode === 'move' ? <AppText style={text}>{t.editTime.vsReschedule}</AppText> : null}
    </View>
  );
}
