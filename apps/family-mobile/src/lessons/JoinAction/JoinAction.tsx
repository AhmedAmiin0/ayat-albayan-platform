import { AppText, type } from '@ab/mobile-kit';
import type { JoinActionProps } from './JoinAction.types';
import { JoinNow } from './JoinNow';
import { useJoinAction } from './use-join-action';

/** Only inside the join window; before it, the reason, on the student's clock. */
export function JoinAction({ lesson, student, now, short = false, live = false }: JoinActionProps) {
  const { ink, hint, waiting } = useJoinAction({ lesson, student, now, short });
  if (hint) {
    return <AppText style={{ fontSize: type.size.xs, color: ink }}>{hint}</AppText>;
  }
  if (waiting) return null;
  return <JoinNow lesson={lesson} studentId={student.id} short={short} live={live} ink={ink} />;
}
