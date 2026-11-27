import { View } from 'react-native';
import { Notice, useTheme } from '@ab/mobile-kit';
import { CardFooter } from '@/lessons/CardFooter';
import { Countdown } from '@/lessons/Countdown';
import { JoinAction } from '@/lessons/JoinAction';
import { LiveStrip, LiveTop } from '@/lessons/live';
import { CardTop } from './CardTop';
import { Details } from './Details';
import type { NextLessonCardProps } from './NextLessonCard.types';
import { useNextLessonCard } from './use-next-lesson-card';

/** The next lesson on the student's own clock; while the room is live it shows who is inside. */
export function NextLessonCard({
  lesson,
  student,
  full = false,
  own = false,
}: NextLessonCardProps) {
  const { color } = useTheme();
  const { now, clock, notice, setNotice, live } = useNextLessonCard(lesson, student);
  return (
    <View style={{ gap: 10 }}>
      {notice ? <Notice message={notice} /> : null}
      <View style={{ gap: 10, padding: 14, borderRadius: 12, backgroundColor: color.lapisFill }}>
        {live ? (
          <LiveTop live={live} />
        ) : (
          <CardTop lesson={lesson} clock={clock} now={now} full={full} own={own} />
        )}
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
