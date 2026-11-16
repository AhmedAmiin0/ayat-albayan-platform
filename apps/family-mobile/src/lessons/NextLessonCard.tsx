import { isLessonNow, lessonMinutes, liveRoom, windowStateAt } from '@ab/client-core';
import type { ClockOptions, PortalLesson, PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import { AppText, t, type, useNow, useTheme } from '@ab/mobile-kit';
import { useFamilyClock } from '@/portal';
import { Countdown } from './Countdown';
import { JoinAction } from './JoinAction';
import { LiveStrip, LiveTop } from './live';
import { rangeText, teacherText, whenText } from './lesson-text';

/** The countdown and the join button follow the clock every second. */
const TICK_MS = 1000;

interface NextLessonCardProps {
  lesson: PortalLesson;
  student: PortalStudent;
  /** The child's «القادمة»: the time range, length, teacher and where it opens. */
  full?: boolean;
  /** A student's own page: «حلقتك القادمة». */
  own?: boolean;
}

/** The full card's lines: the time range and length, the teacher. */
function Details({ lesson, clock }: { lesson: PortalLesson; clock: ClockOptions }) {
  const { color } = useTheme();
  const A = t.portal.app.lesson;
  const minutes = A.minutes.replace('{n}', String(lessonMinutes(lesson)));
  const words = { color: color.onLapis, fontSize: type.size.xs };
  return (
    <>
      <AppText style={{ ...words, fontFamily: type.ui[600], fontSize: type.size.base }}>
        {`${rangeText(lesson, clock)} · ${minutes}`}
      </AppText>
      <AppText style={words}>{A.teacher.replace('{name}', teacherText(lesson.teacher))}</AppText>
    </>
  );
}

interface CardTopProps {
  lesson: PortalLesson;
  clock: ClockOptions;
  now: Date;
  full: boolean;
  own: boolean;
}

/** «الحلقة القادمة · اليوم 6:30 م», and «الدخول متاح الآن» on the full card once it opens. */
function CardTop({ lesson, clock, now, full, own }: CardTopProps) {
  const { color } = useTheme();
  const A = t.portal.app.lesson;
  const words = { color: color.onLapis, fontSize: type.size.xs };
  const open = windowStateAt(lesson.window, now) === 'open' || isLessonNow(lesson, now);
  const title = own ? A.nextLessonSelf : t.portal.nextLesson;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <AppText style={{ ...words, flexShrink: 1, opacity: 0.92 }}>
        {`${title} · ${whenText(new Date(lesson.starts_at), clock, now)}`}
      </AppText>
      {open && full ? (
        <AppText style={{ ...words, fontFamily: type.ui[600] }}>{A.openNow}</AppText>
      ) : null}
    </View>
  );
}

/** The room note over the lapis fill: 0.92 keeps 4.5:1 (0.85 read 4.43:1). */
const NOTE_OPACITY = 0.92;

/**
 * The next lesson on the lapis card (canvas Home, Child): when, the live countdown, then
 * «ادخل الحلقة» once the window opens. Times on the student's own clock. While the room is live
 * (canvas RoomXLiveHome): «الحلقة جارية الآن», how long, who is inside, «ادخل الآن».
 */
export function NextLessonCard(props: NextLessonCardProps) {
  const { lesson, student, full = false, own = false } = props;
  const { color } = useTheme();
  const now = useNow(TICK_MS);
  const clock = { ...useFamilyClock(), tz: student.tz };
  const live = liveRoom(lesson, now);
  const roomNote = full && lesson.way_in === 'classroom';
  const note = { color: color.onLapis, fontSize: type.size.xs, opacity: NOTE_OPACITY };
  return (
    <View style={{ gap: 10, padding: 14, borderRadius: 12, backgroundColor: color.lapisFill }}>
      {live ? (
        <LiveTop live={live} />
      ) : (
        <CardTop lesson={lesson} clock={clock} now={now} full={full} own={own} />
      )}
      {full ? <Details lesson={lesson} clock={clock} /> : null}
      {live ? <LiveStrip live={live} /> : <Countdown lesson={lesson} now={now} big={full} />}
      <JoinAction lesson={lesson} student={student} now={now} live={live !== null} />
      {roomNote ? <AppText style={note}>{t.portal.app.lesson.roomNote}</AppText> : null}
    </View>
  );
}
