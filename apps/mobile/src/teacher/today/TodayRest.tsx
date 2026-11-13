import type { LessonView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { AppText } from '@/core/ui/primitives/AppText';
import { InsetGroup } from '@/core/ui/surface/inset';
import { TeacherLessonRow } from '@/teacher/lessons/TeacherLessonRow';
import { type, useTheme } from '@/theme';

export interface RowHandlers {
  onOpen: (lesson: LessonView) => void;
  onReport: (lessonId: string) => void;
  onNotice: (text: string) => void;
}

interface TodayRestProps {
  lessons: readonly LessonView[];
  /** Only the hero is left and nothing ended: one quiet line instead. */
  noOther: boolean;
  rows: RowHandlers;
}

const titleStyle = { fontFamily: type.ui[700], fontSize: 15, lineHeight: 24 } as const;

/** «بقية اليوم · N» (docs/48): her open, not-ended lessons in one card, each with one lead. */
export function TodayRest({ lessons, noOther, rows }: TodayRestProps) {
  const { color } = useTheme();
  if (noOther) return <Note>{t.teacherToday.noOther}</Note>;
  if (lessons.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <AppText
        accessibilityRole="header"
        style={{ ...titleStyle, color: color.ink, fontVariant: ['tabular-nums'] }}
      >
        {t.today.rest.replace('{n}', String(lessons.length))}
      </AppText>
      <InsetGroup testID="today-rest">
        {lessons.map((lesson) => (
          <TeacherLessonRow key={lesson.id} lesson={lesson} {...rows} />
        ))}
      </InsetGroup>
    </View>
  );
}
