import { isRunningLesson, lessonStatusStyle, localizedName, type SalesScheduleLesson } from '@ab/shared';
import { View } from 'react-native';
import { Tag } from '@/calendar/agenda/Tag';
import { JoinClassroomButton } from '@/classroom/links/JoinClassroomButton';
import { useMinuteClock } from '@/classroom/sessions/use-minute-clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { type, useTheme } from '@/theme';
import { riyadhTime } from '@/today/lesson-text';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';

/**
 * One lesson in sales' read-only day (the admin agenda row without its actions): the Riyadh start,
 * students, teacher, the status chip and «تجريبية» / «تعويضية»; a running lesson adds «جارية الآن»
 * and «ادخل الحلقة» (she joins as the classroom assistant, docs/16). No edit, cancel, move or report.
 */
export function SalesLessonRow({ lesson }: { lesson: SalesScheduleLesson }) {
  const { color } = useTheme();
  const now = useMinuteClock();
  const running = isRunningLesson(lesson, now);
  const body = { fontFamily: type.ui[600], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink };
  const small = { fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink2 };
  const teacher = localizedName({ ar: lesson.teacher.display_name_ar, en: lesson.teacher.display_name_en }, locale);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.rule }}>
      <AppText style={{ ...body, width: 48, fontVariant: ['tabular-nums'] }}>{riyadhTime(lesson.starts_at)}</AppText>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText numberOfLines={2} style={body}>
          {lesson.students.map((s) => s.name).join(t.common.listSeparator)}
        </AppText>
        <AppText style={small}>{`${t.classroom.assistants.teacher} ${teacher}`}</AppText>
        {running ? <JoinClassroomButton lesson={lesson} /> : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {running ? <StatusChip tone="ok" glyph="fill" label={t.sales.academySchedule.liveNow} size="sm" /> : null}
        <StatusChip {...lessonStatusStyle[lesson.status]} label={t.enums.lessonStatus[lesson.status]} size="sm" />
        {lesson.trial ? <Tag>{t.schedule.trialTag}</Tag> : null}
        {lesson.makeup ? <Tag>{t.booking.makeup.tag}</Tag> : null}
      </View>
    </View>
  );
}
