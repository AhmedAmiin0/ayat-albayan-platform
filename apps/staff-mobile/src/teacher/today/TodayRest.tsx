import type { LessonView } from '@ab/schedule';
import { View } from 'react-native';
import { t, AppText, InsetGroup, type, useTheme } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { TeacherLessonRow } from '@/teacher/lessons/TeacherLessonRow';

export interface RowHandlers {
  onOpen: (lesson: LessonView) => void;
  onReport: (lessonId: string) => void;
  onNotice: (text: string) => void;
  compact?: boolean;
}

interface TodayRestProps {
  lessons: readonly LessonView[];
  /** Only the hero is left and nothing ended: one quiet line instead. */
  noOther: boolean;
  rows: RowHandlers;
}

const titleStyle = { fontFamily: type.ui[700], fontSize: 15, lineHeight: 24 } as const;

/** One lead per lesson (docs/48). */
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
