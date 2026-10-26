import { lessonStatusStyle, type LessonView } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { toneColors } from '@/core/ui/feedback/StatusChip';
import { type, useTheme } from '@/theme';
import { riyadhTime, rowSubtitle, studentNames } from '../lib/lesson-text';

export interface LessonRowProps {
  lesson: LessonView;
  /** Opens the lesson details sheet, where the lesson's actions live. */
  onOpen: (lesson: LessonView) => void;
  /** An ended lesson under the fold: a tighter, quieter row. */
  compact?: boolean;
}

/**
 * One lesson in «بقية اليوم» (docs/29 §4): the Riyadh time, the students and «أ. سلمى · 30 دقيقة»,
 * and at the end a 7pt dot with the status word in its tone. The whole row is one button: no
 * buttons on it, every action is in the sheet.
 */
export function LessonRow({ lesson, onOpen, compact = false }: LessonRowProps) {
  const { color } = useTheme();
  const tone = toneColors(color, lessonStatusStyle[lesson.status].tone).fg;
  const time = riyadhTime(lesson.starts_at);
  const names = studentNames(lesson);
  const status = t.enums.lessonStatus[lesson.status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.today.openLesson.replace('{time}', time).replace('{names}', names).replace('{status}', status)}
      onPress={() => onOpen(lesson)}
      style={({ pressed }) => ({
        minHeight: compact ? 52 : 62,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <AppText
        style={{
          width: 46,
          fontFamily: type.ui[600],
          fontSize: 15,
          lineHeight: 22,
          color: compact ? color.ink3 : color.ink2,
          fontVariant: ['tabular-nums'],
        }}
      >
        {time}
      </AppText>
      <View style={{ flex: 1 }}>
        <AppText
          numberOfLines={1}
          style={{ fontFamily: type.ui[compact ? 500 : 600], fontSize: compact ? 14 : 15, lineHeight: 24, color: compact ? color.ink2 : color.ink }}
        >
          {names}
        </AppText>
        <AppText numberOfLines={1} style={{ fontFamily: type.ui[400], fontSize: 12, lineHeight: 18, color: color.ink3 }}>
          {rowSubtitle(lesson)}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: tone }} />
        <AppText style={{ fontFamily: type.ui[500], fontSize: 12, lineHeight: 18, color: tone }}>{status}</AppText>
      </View>
    </Pressable>
  );
}
