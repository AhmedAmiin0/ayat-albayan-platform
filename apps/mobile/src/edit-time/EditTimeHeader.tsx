import { View } from 'react-native';
import { whenText } from '@/booking/slots';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { studentNames } from '@/today/lesson-text';
import { AppText } from '@/core/ui/primitives/AppText';
import { lengthOf } from './edit-time-body';
import { lengthText } from './edit-time-text';
import type { EditableLesson, TimeEditMode } from './types';

export interface EditTimeHeaderProps {
  lesson: EditableLesson;
  mode: TimeEditMode;
  /** The family's zone, for the student's clock. */
  tz: string;
}

/**
 * Who, when now and for how long, so a migrated 40-minute lesson (no length pill is selected for
 * it) still says what it is. A move says up front that «غيّر الميعاد» is the one for a series.
 */
export function EditTimeHeader({ lesson, mode, tz }: EditTimeHeaderProps) {
  const { color } = useTheme();
  const text = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  return (
    <View style={{ gap: 2 }}>
      <AppText style={{ ...text, fontFamily: type.ui[700], fontSize: type.size.body, color: color.ink }}>
        {studentNames(lesson)}
      </AppText>
      <AppText style={text}>{t.reschedule.current.replace('{when}', whenText(lesson.starts_at, tz))}</AppText>
      <AppText style={text}>{t.editTime.currentLength.replace('{len}', lengthText(lengthOf(lesson)))}</AppText>
      {mode === 'move' ? <AppText style={text}>{t.editTime.vsReschedule}</AppText> : null}
    </View>
  );
}
