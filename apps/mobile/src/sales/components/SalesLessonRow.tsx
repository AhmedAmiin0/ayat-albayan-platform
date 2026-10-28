import { isRunningLesson, lessonStatusStyle, localizedName, RIYADH_TZ, wallParts, type SalesScheduleLesson } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { Tag } from '@/calendar/agenda/Tag';
import { dayLabel } from '@/calendar';
import { JoinClassroomButton } from '@/classroom/links/JoinClassroomButton';
import { useNow } from '@/core/lib/time/use-now';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { type, useTheme } from '@/theme';
import { riyadhTime } from '@/today/lib/lesson-text';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { useInset } from '@/core/ui/surface/inset';

/**
 * One lesson in sales' read-only day (the admin agenda row without its actions): the Riyadh start,
 * students, teacher, the status chip and «تجريبية» / «تعويضية»; a running lesson adds «جارية الآن»
 * and «ادخل الحلقة» (she joins as the classroom assistant, docs/16). No edit, cancel, move or report.
 * The line is a 44pt button to the read-only «تفاصيل الحلقة» (`onOpen`); «ادخل الحلقة» sits outside it.
 * Its hint reads the Riyadh day and time; `dated` (a list over several days) puts them in its name too.
 * In the day's inset card (owner 2026-10-28: one container rule) it takes the card's 16pt padding and
 * leaves the rule between rows to the card; alone (a student's «الحلقات القادمة») it keeps its own rule.
 */
export function SalesLessonRow(props: { lesson: SalesScheduleLesson; onOpen?: (lesson: SalesScheduleLesson) => void; dated?: boolean }) {
  const { lesson, onOpen, dated = false } = props;
  const { color } = useTheme();
  const inset = useInset();
  const cycle = useClockCycle();
  const now = useNow();
  const running = isRunningLesson(lesson, now);
  const body = { fontFamily: type.ui[600], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink };
  const small = { fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink2 };
  const teacher = localizedName({ ar: lesson.teacher.display_name_ar, en: lesson.teacher.display_name_en }, locale);
  const who = lesson.students.map((s) => s.name).join(t.common.listSeparator);
  const when = `${dayLabel(wallParts(lesson.starts_at, RIYADH_TZ).date)} ${riyadhTime(lesson.starts_at, cycle)}`;
  const label = t.lessons.sheet.openRow.replace('{names}', who);
  const lineStyle = { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10, minHeight: 44 };
  const line = (
    <>
      <AppText style={{ ...body, width: cycle === '12' ? 72 : 48, fontVariant: ['tabular-nums'] }}>{riyadhTime(lesson.starts_at, cycle)}</AppText>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText numberOfLines={2} style={body}>
          {who}
        </AppText>
        <AppText style={small}>{`${t.classroom.assistants.teacher} ${teacher}`}</AppText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {running ? <StatusChip tone="ok" glyph="fill" label={t.sales.academySchedule.liveNow} size="sm" /> : null}
        <StatusChip {...lessonStatusStyle[lesson.status]} label={t.enums.lessonStatus[lesson.status]} size="sm" />
        {lesson.trial ? <Tag>{t.schedule.trialTag}</Tag> : null}
        {lesson.makeup ? <Tag>{t.booking.makeup.tag}</Tag> : null}
      </View>
    </>
  );
  return (
    <View style={{ gap: 6, paddingVertical: 10, ...(inset ? { paddingHorizontal: 16 } : { borderBottomWidth: 1, borderBottomColor: color.rule }) }}>
      {onOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dated ? `${label} · ${when}` : label}
          accessibilityHint={`${when} · ${t.enums.lessonStatus[lesson.status]}`}
          onPress={() => onOpen(lesson)}
          style={({ pressed }) => [lineStyle, pressed ? { backgroundColor: color.sunk } : null]}
        >
          {line}
        </Pressable>
      ) : (
        <View style={lineStyle}>{line}</View>
      )}
      {running ? (
        <View style={{ paddingStart: 58 }}>
          <JoinClassroomButton lesson={lesson} />
        </View>
      ) : null}
    </View>
  );
}
