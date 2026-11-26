import { isRunningLesson } from '@ab/shared';
import { wallParts } from '@ab/schedule';
import type { SalesScheduleLesson } from '@ab/shared';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { dayLabel } from '@/calendar';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t, type, useTheme, AppText, toneColors, useInset, useNow } from '@ab/mobile-kit';
import { lessonClock, rowSubtitle, studentNames, viewerDayHint } from '@/today';
import { useLessonStatusText } from '@/core/ui/feedback/lesson-status';

interface SalesLessonRowProps {
  lesson: SalesScheduleLesson;
  /** Opens the lesson details, where every action lives. */
  onOpen?: (lesson: SalesScheduleLesson) => void;
  /** A list over several days: the day and time go in the row's spoken name too. */
  dated?: boolean;
  /** A status filter is picked so every row shares it; only the running state still shows. */
  hideStatus?: boolean;
}

/** Like Today's LessonRow (docs/29 §4): one 44pt button to the details, no buttons on it. */
export function SalesLessonRow(props: SalesLessonRowProps) {
  const { lesson, onOpen, dated = false, hideStatus = false } = props;
  const { color } = useTheme();
  const { fontScale } = useWindowDimensions();
  const inset = useInset();
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const now = useNow();
  const running = isRunningLesson(lesson, now);
  const text = useLessonStatusText();
  const time = lessonClock(lesson.starts_at, tz, cycle);
  const who = studentNames(lesson);
  // A `?date` (Riyadh) day: another day for the viewer is named (dated rows already say it).
  const hint = dated ? null : viewerDayHint(lesson.starts_at, tz);
  const subtitle = [hint, rowSubtitle(lesson)].filter(Boolean).join(' · ');
  const when = `${dayLabel(wallParts(lesson.starts_at, tz).date)} ${time}`;
  const label = t.lessons.sheet.openRow.replace('{names}', who);
  // A running confirmed lesson shows only running; one still to confirm keeps its status too.
  const status = !running || lesson.status !== 'confirmed';
  const words = [
    ...(running ? [{ word: t.lessons.sheet.live, tone: toneColors(color, 'ok').fg }] : []),
    ...(status && !hideStatus
      ? [
          {
            word: text.word(lesson.status),
            tone: toneColors(color, text.look(lesson.status).tone).fg,
          },
        ]
      : []),
  ];
  const spoken = [...(running ? [t.lessons.sheet.live] : []), ...(status ? [text.label(lesson.status)] : [])].join(' · ');
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
        <AppText
          numberOfLines={1}
          style={{ fontFamily: type.ui[600], fontSize: 15, lineHeight: 24, color: color.ink }}
        >
          {who}
        </AppText>
        <AppText
          numberOfLines={1}
          style={{
            fontFamily: type.ui[400],
            fontSize: type.size.xs,
            lineHeight: type.lineHeight(type.size.xs),
            color: color.ink3,
          }}
        >
          {subtitle}
        </AppText>
      </View>
      {words.length > 0 ? (
        <View style={{ flexShrink: 1, maxWidth: '38%' }}>
          {words.map(({ word, tone }) => (
            <View key={word} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: tone }} />
              <AppText
                style={{
                  flexShrink: 1,
                  fontFamily: type.ui[500],
                  fontSize: 12,
                  lineHeight: 18,
                  color: tone,
                }}
              >
                {word}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
  return (
    <View
      style={{
        paddingVertical: 10,
        ...(inset
          ? { paddingHorizontal: 16 }
          : { borderBottomWidth: 1, borderBottomColor: color.rule }),
      }}
    >
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
