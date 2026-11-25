import { isLessonNow, lessonMinutes, liveRoom, windowStateAt } from '@ab/client-core';
import type { PortalLesson, PortalStudent } from '@ab/shared';
import { firstName } from '@ab/schedule';
import type { ClockOptions } from '@ab/time';
import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Notice, t, type, useNow, useTheme } from '@ab/mobile-kit';
import { useFamilyClock } from '@/portal';
import { CardFooter, SOFT_INK } from './CardFooter';
import { Countdown } from './Countdown';
import { JoinAction } from './JoinAction';
import { rangeText, teacherText, whenText } from './lesson-text';
import { LiveStrip, LiveTop } from './live';
import { LessonChip } from './options/LessonChip';
import { RequestLine } from './options/RequestLine';

/** The countdown and the join button follow the clock every second. */
const TICK_MS = 1000;

interface NextLessonCardProps {
  lesson: PortalLesson;
  student: PortalStudent;
  full?: boolean;
  own?: boolean;
}

interface DetailsProps {
  lesson: PortalLesson;
  student: PortalStudent;
  clock: ClockOptions;
  now: Date;
}

/** The full card's lines: the time range and length, the teacher, what the family did. */
function Details({ lesson, student, clock, now }: DetailsProps) {
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
      <RequestLine
        lesson={lesson}
        clock={clock}
        ink={color.onLapis}
        now={now}
        student={firstName(student.name)}
      />
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

function CardTop({ lesson, clock, now, full, own }: CardTopProps) {
  const { color } = useTheme();
  const A = t.portal.app.lesson;
  const words = { color: color.onLapis, fontSize: type.size.xs };
  const open = windowStateAt(lesson.window, now) === 'open' || isLessonNow(lesson, now);
  const title = own ? A.nextLessonSelf : t.portal.nextLesson;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <AppText style={{ ...words, flexShrink: 1, opacity: SOFT_INK }}>
        {`${title} · ${whenText(new Date(lesson.starts_at), clock, now)}`}
      </AppText>
      {open && full ? (
        <AppText style={{ ...words, fontFamily: type.ui[600] }}>{A.openNow}</AppText>
      ) : (
        <LessonChip lesson={lesson} />
      )}
    </View>
  );
}

/** The next lesson on the student's own clock; while the room is live it shows who is inside. */
export function NextLessonCard(props: NextLessonCardProps) {
  const { lesson, student, full = false, own = false } = props;
  const { color } = useTheme();
  const now = useNow(TICK_MS);
  const clock = { ...useFamilyClock(), tz: student.tz };
  const [notice, setNotice] = useState<string | null>(null);
  const live = liveRoom(lesson, now);
  const top = { lesson, clock, now, full, own };
  return (
    <View style={{ gap: 10 }}>
      {notice ? <Notice message={notice} /> : null}
      <View style={{ gap: 10, padding: 14, borderRadius: 12, backgroundColor: color.lapisFill }}>
        {live ? <LiveTop live={live} /> : <CardTop {...top} />}
        {full ? <Details lesson={lesson} student={student} clock={clock} now={now} /> : null}
        {live ? <LiveStrip live={live} /> : <Countdown lesson={lesson} now={now} big={full} />}
        <JoinAction lesson={lesson} student={student} now={now} live={live !== null} />
        {full ? (
          <CardFooter
            lesson={lesson}
            student={student}
            clock={clock}
            now={now}
            live={live !== null}
            onNotice={setNotice}
          />
        ) : null}
      </View>
    </View>
  );
}
