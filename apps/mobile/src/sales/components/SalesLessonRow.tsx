import { isRunningLesson, lessonStatusStyle, RIYADH_TZ, wallParts, type SalesScheduleLesson } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { dayLabel } from '@/calendar';
import { useNow } from '@/core/lib/time/use-now';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { riyadhTime, rowSubtitle, studentNames } from '@/today/lib/lesson-text';
import { AppText } from '@/core/ui/primitives/AppText';
import { toneColors } from '@/core/ui/feedback/StatusChip';
import { useInset } from '@/core/ui/surface/inset';
import { statusWord } from '@/core/ui/feedback/lesson-status';

interface SalesLessonRowProps {
  lesson: SalesScheduleLesson;
  /** Opens «تفاصيل الحلقة», where every action lives («ادخل الحلقة» first while it runs). */
  onOpen?: (lesson: SalesScheduleLesson) => void;
  /** A list over several days: the day and time go in the row's spoken name too. */
  dated?: boolean;
  /** A status pill is chosen, so every row shares that status: only «جارية الآن» still shows. */
  hideStatus?: boolean;
}

/**
 * One lesson in sales' day, laid out like Today's LessonRow (docs/29 §4): the Riyadh time on ONE line,
 * the students over «أ. سامية · 45 دقيقة · تجريبية», and at the end a 7pt dot with ONE word in its tone:
 * «جارية الآن» while it runs, else the status (none under a status pill, `hideStatus`). The row is one
 * 44pt button to «تفاصيل الحلقة» (`onOpen`) with no buttons on it (owner 2026-10-29: «ادخل الحلقة» is the
 * sheet's first action). Its hint reads the Riyadh day and time, the status and the second line; `dated`
 * puts the day and time in its name too. In the day's inset card (owner 2026-10-28: one container rule)
 * it takes the card's 16pt padding and leaves the rule between rows to the card; alone (a student's
 * «الحلقات القادمة») it keeps its own rule.
 */
export function SalesLessonRow(props: SalesLessonRowProps) {
  const { lesson, onOpen, dated = false, hideStatus = false } = props;
  const { color } = useTheme();
  const inset = useInset();
  const cycle = useClockCycle();
  const now = useNow();
  const running = isRunningLesson(lesson, now);
  const time = riyadhTime(lesson.starts_at, cycle);
  const who = studentNames(lesson);
  const subtitle = rowSubtitle(lesson);
  const when = `${dayLabel(wallParts(lesson.starts_at, RIYADH_TZ).date)} ${time}`;
  const label = t.lessons.sheet.openRow.replace('{names}', who);
  const word = running ? t.lessons.sheet.live : hideStatus ? null : statusWord(lesson.status);
  const tone = toneColors(color, running ? 'ok' : lessonStatusStyle[lesson.status].tone).fg;
  const lineStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, minHeight: 44 };
  const line = (
    <>
      <AppText
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={{
          width: cycle === '12' ? 70 : 46,
          fontFamily: type.ui[600],
          fontSize: 15,
          lineHeight: 22,
          color: color.ink2,
          fontVariant: ['tabular-nums'],
        }}
      >
        {time}
      </AppText>
      <View style={{ flex: 1 }}>
        <AppText numberOfLines={1} style={{ fontFamily: type.ui[600], fontSize: 15, lineHeight: 24, color: color.ink }}>
          {who}
        </AppText>
        <AppText
          numberOfLines={1}
          style={{ fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink3 }}
        >
          {subtitle}
        </AppText>
      </View>
      {word ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, maxWidth: '38%' }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: tone }} />
          <AppText style={{ flexShrink: 1, fontFamily: type.ui[500], fontSize: 12, lineHeight: 18, color: tone }}>{word}</AppText>
        </View>
      ) : null}
    </>
  );
  return (
    <View style={{ paddingVertical: 10, ...(inset ? { paddingHorizontal: 16 } : { borderBottomWidth: 1, borderBottomColor: color.rule }) }}>
      {onOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dated ? `${label} · ${when}` : label}
          accessibilityHint={`${when} · ${running ? t.lessons.sheet.live : t.enums.lessonStatus[lesson.status]} · ${subtitle}`}
          onPress={() => onOpen(lesson)}
          style={({ pressed }) => [lineStyle, pressed ? { backgroundColor: color.sunk } : null]}
        >
          {line}
        </Pressable>
      ) : (
        <View style={lineStyle}>{line}</View>
      )}
    </View>
  );
}
