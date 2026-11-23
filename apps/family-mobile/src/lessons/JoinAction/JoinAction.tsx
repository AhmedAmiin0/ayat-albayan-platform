import { lessonWait, lessonWaitText } from '@ab/client-core';
import type { PortalLesson, PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { useFamilyClock } from '#/portal/index.ts';
import { JoinButton } from '#/lessons/JoinButton.tsx';
import { useJoin } from '#/lessons/use-join.ts';

interface JoinActionProps {
  lesson: PortalLesson;
  student: PortalStudent;
  now: Date;
  /** A schedule row: the small «ادخل» or nothing (no hint line). */
  short?: boolean;
  /** The room is live: «ادخل الآن» on the card. */
  live?: boolean;
}

interface JoinNowProps {
  lesson: PortalLesson;
  studentId: string;
  short: boolean;
  live: boolean;
  /** The error line's colour. */
  ink: string;
}

/** The button inside the window, and why the room did not open when it failed. */
function JoinNow({ lesson, studentId, short, live, ink }: JoinNowProps) {
  const join = useJoin(studentId);
  return (
    <View style={{ gap: 6 }}>
      <JoinButton
        short={short}
        live={live}
        busy={join.isPending}
        onPress={() => join.mutate(lesson)}
      />
      {join.isError ? (
        <AppText accessibilityRole="alert" style={{ fontSize: type.size.xs, color: ink }}>
          {t.portal.app.lesson.joinFailed}
        </AppText>
      ) : null}
    </View>
  );
}

/**
 * «ادخل الحلقة», only inside the join window (it lights up by itself as the clock ticks); before
 * it, why not (@ab/client-core lessonWait), in the family's words on the student's clock.
 */
export function JoinAction(props: JoinActionProps) {
  const { lesson, student, now, short = false, live = false } = props;
  const { color } = useTheme();
  // On the lapis card the words are white; on a schedule row the error reads in the bad tone.
  const ink = short ? color.bad : color.onLapis;
  const clock = useFamilyClock();
  const wait = lessonWait(lesson, now);
  const words = { words: t.portal, clock: { ...clock, tz: student.tz } };
  const hint = wait && !short ? lessonWaitText(wait, lesson, words) : null;
  if (hint) {
    return <AppText style={{ fontSize: type.size.xs, color: ink }}>{hint}</AppText>;
  }
  if (wait) return null;
  return <JoinNow lesson={lesson} studentId={student.id} short={short} live={live} ink={ink} />;
}
