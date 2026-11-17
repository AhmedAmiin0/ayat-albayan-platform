import { isLessonNow, lessonMinutes, windowStateAt } from '@ab/client-core';
import type { ClockOptions, PortalLesson, PortalStudent } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Notice, t, type, useNow, useTheme } from '@ab/mobile-kit';
import { useFamilyClock } from '@/portal';
import { Countdown } from './Countdown';
import { JoinAction } from './JoinAction';
import { dateLine, rangeText, teacherText, whenText } from './lesson-text';
import { LessonChip } from './options/LessonChip';
import { LessonOptions } from './options/LessonOptions';
import { RequestLine } from './options/RequestLine';

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
      <RequestLine lesson={lesson} clock={clock} ink={color.onLapis} />
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
      ) : (
        <LessonChip lesson={lesson} />
      )}
    </View>
  );
}

/**
 * The next lesson on the lapis card (canvas Home, Child): when and its chip, the live countdown,
 * then «ادخل الحلقة» once the window opens; the full card adds what the family asked and
 * «خيارات الحلقة» (owner 2026-11-17), its result said above the card. The student's own clock.
 */
export function NextLessonCard(props: NextLessonCardProps) {
  const { lesson, student, full = false, own = false } = props;
  const { color } = useTheme();
  const now = useNow(TICK_MS);
  const clock = { ...useFamilyClock(), tz: student.tz };
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <View style={{ gap: 10 }}>
      {notice ? <Notice message={notice} /> : null}
      <View style={{ gap: 10, padding: 14, borderRadius: 12, backgroundColor: color.lapisFill }}>
        <CardTop lesson={lesson} clock={clock} now={now} full={full} own={own} />
        {full ? <Details lesson={lesson} clock={clock} /> : null}
        <Countdown lesson={lesson} now={now} big={full} />
        <JoinAction lesson={lesson} student={student} now={now} />
        {full ? <CardFooter {...props} clock={clock} now={now} onNotice={setNotice} /> : null}
      </View>
    </View>
  );
}

type FooterProps = NextLessonCardProps & {
  clock: ClockOptions;
  now: Date;
  onNotice: (message: string) => void;
};

/** The full card's end: where our room opens, and «خيارات الحلقة». */
function CardFooter({ lesson, student, clock, now, onNotice }: FooterProps) {
  const { color } = useTheme();
  const note = { color: color.onLapis, fontSize: type.size.xs, opacity: 0.85 };
  const heading = `${dateLine(new Date(lesson.starts_at), clock)} · ${rangeText(lesson, clock)}`;
  return (
    <>
      {lesson.way_in === 'classroom' ? (
        <AppText style={note}>{t.portal.app.lesson.roomNote}</AppText>
      ) : null}
      <LessonOptions
        lesson={lesson}
        student={student}
        now={now}
        heading={heading}
        onNotice={onNotice}
      />
    </>
  );
}
