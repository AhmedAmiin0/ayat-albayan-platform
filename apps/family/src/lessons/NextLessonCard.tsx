import { isLessonNow, lessonMinutes, windowStateAt } from '@ab/client-core';
import type { PortalLesson, PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import { AppText, t, type, useNow, useTheme } from '@ab/mobile-kit';
import { useFamilyClock } from '@/portal';
import { Countdown } from './Countdown';
import { JoinAction } from './JoinAction';
import { rangeText, teacherText, whenText } from './lesson-text';

/** The countdown and the join button follow the clock every second. */
const TICK_MS = 1000;

interface NextLessonCardProps {
  lesson: PortalLesson;
  student: PortalStudent;
  /** The child's «القادمة»: the time range, length, teacher and where it opens. */
  full?: boolean;
}

/**
 * The next lesson on the lapis card (canvas Home, Child): when, the live countdown, then
 * «ادخل الحلقة» once the window opens. Times on the student's own clock.
 */
export function NextLessonCard({ lesson, student, full = false }: NextLessonCardProps) {
  const { color } = useTheme();
  const now = useNow(TICK_MS);
  const clock = { ...useFamilyClock(), tz: student.tz };
  const at = new Date(lesson.starts_at);
  const open = windowStateAt(lesson.window, now) === 'open' || isLessonNow(lesson, now);
  const A = t.portal.app.lesson;
  const minutes = lessonMinutes(lesson);
  const words = { color: color.onLapis, fontSize: type.size.xs };
  return (
    <View style={{ gap: 10, padding: 14, borderRadius: 12, backgroundColor: color.lapisFill }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <AppText style={{ ...words, flexShrink: 1, opacity: 0.92 }}>
          {`${t.portal.nextLesson} · ${whenText(at, clock, now)}`}
        </AppText>
        {open && full ? (
          <AppText style={{ ...words, fontFamily: type.ui[600] }}>{A.openNow}</AppText>
        ) : null}
      </View>
      {full ? (
        <AppText style={{ ...words, fontFamily: type.ui[600], fontSize: type.size.base }}>
          {`${rangeText(lesson, clock)} · ${A.minutes.replace('{n}', String(minutes))}`}
        </AppText>
      ) : null}
      {full ? (
        <AppText style={words}>{A.teacher.replace('{name}', teacherText(lesson.teacher))}</AppText>
      ) : null}
      <Countdown lesson={lesson} now={now} />
      <JoinAction lesson={lesson} student={student} now={now} />
      {full && lesson.way_in === 'classroom' ? (
        <AppText style={{ ...words, opacity: 0.85 }}>{A.roomNote}</AppText>
      ) : null}
    </View>
  );
}
