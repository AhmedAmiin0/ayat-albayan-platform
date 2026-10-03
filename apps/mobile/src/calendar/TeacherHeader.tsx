import { teacherName } from '@ab/shared';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Chevron } from '@/ui/Chevron';
import type { TeacherAgenda } from './overview';
import { teacherMeta, timeOffLine, windowsLine } from './overview-text';

export interface TeacherHeaderProps {
  agenda: TeacherAgenda;
  /** Day view: the day's windows as a faint «متاح …» line. */
  showWindows: boolean;
}

/**
 * A «الجدول» section's head: the name (opens the teacher), «معلمة · القرآن الكريم · 3 من 10 طالب ·
 * القاهرة», then the day's availability, any time off touching the period (neutral ink: cinnabar is
 * for errors and stopped states), and «مفيش حلقات» when nothing is booked.
 */
export function TeacherHeader({ agenda, showWindows }: TeacherHeaderProps) {
  const { color } = useTheme();
  const { teacher } = agenda;
  const faint = {
    fontFamily: type.ui[400],
    fontSize: type.size.xs,
    lineHeight: type.lineHeight(type.size.xs),
  };
  const available = showWindows ? windowsLine(agenda.windows) : null;
  return (
    // Sticky over the rows (SectionList): the page's own ground, so nothing shows through.
    <View style={{ gap: 2, paddingTop: 10, paddingBottom: 2, backgroundColor: color.margin }}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t.teachers.profile}
        onPress={() => router.push(`/more/teachers/${teacher.id}`)}
        style={{
          minHeight: shape.control.touch,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          alignSelf: 'flex-start',
        }}
      >
        <AppText
          accessibilityRole="header"
          style={{
            fontFamily: type.ui[700],
            fontSize: type.size.base,
            lineHeight: type.lineHeight(type.size.base),
            color: color.lapis,
          }}
        >
          {teacherName(teacher, locale)}
        </AppText>
        <Chevron to="next" color={color.lapis} size={16} />
      </Pressable>
      <AppText style={{ ...faint, color: color.ink2, fontVariant: ['tabular-nums'] }}>
        {teacherMeta(teacher)}
      </AppText>
      {available ? <AppText style={{ ...faint, color: color.ink3 }}>{available}</AppText> : null}
      {agenda.timeOff.map((off) => (
        <AppText key={off.id} style={{ ...faint, color: color.ink2 }}>
          {timeOffLine(off)}
        </AppText>
      ))}
      {agenda.items.some((i) => i.kind === 'lesson') ? null : (
        <AppText style={{ ...faint, color: color.ink3 }}>{t.schedule.noLessons}</AppText>
      )}
    </View>
  );
}
