import type { LessonView } from '@ab/shared';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Chevron } from '@/ui/Chevron';
import type { TeacherLessons } from './agenda';
import { AgendaLessonRow } from './AgendaLessonRow';

export interface TeacherGroupProps {
  group: TeacherLessons;
  onReschedule: (lesson: LessonView) => void;
}

/** «الجدول»: one teacher's lessons of the day under the name; the name (a 44pt link, chevron) opens their week. */
export function TeacherGroup({ group, onReschedule }: TeacherGroupProps) {
  const { color } = useTheme();
  const { teacher } = group;
  return (
    <View style={{ gap: 2, paddingTop: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t.calendar.teacherCalendar}
        onPress={() => router.push(`/more/teachers/calendar/${teacher.id}`)}
        style={{ minHeight: shape.control.touch, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
      >
        <AppText
          accessibilityRole="header"
          style={{
            fontFamily: type.ui[700],
            fontSize: type.size.sm,
            lineHeight: type.lineHeight(type.size.sm),
            color: color.lapis,
          }}
        >
          {teacher.display_name_ar}
        </AppText>
        <Chevron to="next" color={color.lapis} size={16} />
      </Pressable>
      {group.lessons.map((lesson) => (
        <AgendaLessonRow key={lesson.id} lesson={lesson} onReschedule={onReschedule} />
      ))}
    </View>
  );
}
