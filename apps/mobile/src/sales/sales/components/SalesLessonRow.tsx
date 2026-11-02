import { isRunningLesson, lessonStatusStyle, wallParts } from '@ab/shared';
import type { SalesScheduleLesson } from '@ab/shared';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { dayLabel } from '@/calendar';
import { useNow } from '@/core/lib/time/use-now';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { lessonClock, rowSubtitle, studentNames, viewerDayHint } from '@/today';
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
  /** «للتأكيد» or «مؤكدة» is chosen, so every row shares that status: only «جارية الآن» still shows. */
  hideStatus?: boolean;
}

/**
 * One lesson in sales' day, laid out like Today's LessonRow (docs/29 §4): the local time on ONE line,
 * the students over «تجريبية · أ. سامية · 45 دقيقة», and at the end a 7pt dot with a word in its tone: the
 * status, or «جارية الآن» while it runs; a running lesson not yet confirmed shows both, one over the
 * other (no status word under «للتأكيد» / «مؤكدة», `hideStatus`). The row is one 44pt button to «تفاصيل
 * الحلقة» (`onOpen`) with no buttons on it (UX review 2026-10-29: «ادخل الحلقة» is the sheet's first
 * action). Its hint reads the local day and time, the status and the second line; `dated` puts the day
 * and time in its name too. In the day's inset card (owner 2026-10-28: one container rule) it takes the
 * card's 16pt padding and leaves the rule between rows to the card; alone (a student's «الحلقات القادمة»)
 * it keeps its own rule. The time cell widens with the font scale (up to 1.3×) before the text shrinks.
 */
export function SalesLessonRow(props: SalesLessonRowProps) {
  const { lesson, onOpen, dated = false, hideStatus = false } = props;
  const { color } = useTheme();
  const { fontScale } = useWindowDimensions();
  const inset = useInset();
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const now = useNow();
  const running = isRunningLesson(lesson, now);
  const time = lessonClock(lesson.starts_at, tz, cycle);
  const who = studentNames(lesson);
  // A `?date` (Riyadh) day: another day for the viewer is named (dated rows already say it).
  const hint = dated ? null : viewerDayHint(lesson.starts_at, tz);
  const subtitle = [hint, rowSubtitle(lesson)].filter(Boolean).join(' · ');
  const when = `${dayLabel(wallParts(lesson.starts_at, tz).date)} ${time}`;
  const label = t.lessons.sheet.openRow.replace('{names}', who);
  // A running lesson already confirmed reads «جارية الآن» alone; one still to confirm keeps its word too.
  const status = !running || lesson.status !== 'confirmed';
  const words = [
    ...(running ? [{ word: t.lessons.sheet.live, tone: toneColors(color, 'ok').fg }] : []),
    ...(status && !hideStatus ? [{ word: statusWord(lesson.status), tone: toneColors(color, lessonStatusStyle[lesson.status].tone).fg }] : []),
  ];
  const spoken = [...(running ? [t.lessons.sheet.live] : []), ...(status ? [t.enums.lessonStatus[lesson.status]] : [])].join(' · ');
  const lineStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, minHeight: 44 };
  const line = (
    <>
      <AppText
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={{
          width: (cycle === '12' ? 70 : 46) * Math.min(Math.max(fontScale, 1), 1.3),
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
      {words.length > 0 ? (
        <View style={{ flexShrink: 1, maxWidth: '38%' }}>
          {words.map(({ word, tone }) => (
            <View key={word} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: tone }} />
              <AppText style={{ flexShrink: 1, fontFamily: type.ui[500], fontSize: 12, lineHeight: 18, color: tone }}>{word}</AppText>
            </View>
          ))}
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
          accessibilityHint={`${when} · ${spoken} · ${subtitle}`}
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
