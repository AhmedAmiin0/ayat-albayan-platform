import { lessonWait, lessonWaitText } from '@ab/client-core';
import type { PortalLesson, PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { useFamilyClock } from '@/portal';
import { JoinButton } from './JoinButton';
import { useJoin } from './use-join';

interface JoinActionProps {
  lesson: PortalLesson;
  student: PortalStudent;
  now: Date;
  /** A schedule row: the small «ادخل» or nothing (no hint line). */
  short?: boolean;
}

/**
 * «ادخل الحلقة», only inside the join window (it lights up by itself as the clock ticks); before
 * it, why not (@ab/client-core lessonWait), in the family's words on the student's clock.
 */
export function JoinAction({ lesson, student, now, short = false }: JoinActionProps) {
  const { color } = useTheme();
  // On the lapis card the words are white; on a schedule row the error reads in the bad tone.
  const ink = short ? color.bad : color.onLapis;
  const clock = useFamilyClock();
  const join = useJoin(student.id);
  const wait = lessonWait(lesson, now);
  const words = { words: t.portal, clock: { ...clock, tz: student.tz } };
  const hint = wait && !short ? lessonWaitText(wait, lesson, words) : null;
  if (hint) {
    return <AppText style={{ fontSize: type.size.xs, color: ink }}>{hint}</AppText>;
  }
  if (wait) return null;
  return (
    <View style={{ gap: 6 }}>
      <JoinButton short={short} busy={join.isPending} onPress={() => join.mutate(lesson)} />
      {join.isError ? (
        <AppText accessibilityRole="alert" style={{ fontSize: type.size.xs, color: ink }}>
          {t.portal.app.lesson.joinFailed}
        </AppText>
      ) : null}
    </View>
  );
}
