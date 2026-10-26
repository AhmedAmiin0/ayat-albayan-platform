import { clockTime, isOpenLesson, type PortalLesson, type RoomJoinResult } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { buttonVariants, Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { classroomErrorText, windowStateAt } from '@/features/teaching/classroom';
import { t } from '@/lib/i18n/i18n';
import { portalJoin } from '../api';

interface Props {
  lesson: PortalLesson;
  studentId: string;
  tz: string;
  now: Date;
  /** Our classroom admitted the student: the panel opens the room. */
  onJoined: (join: RoomJoinResult) => void;
}

const Hint = ({ text }: { text: string }) => <p className="text-sm text-ink-2">{text}</p>;

/** Why there is no button: cancelled, over, not open yet, or no way in known. */
function waitText(lesson: PortalLesson, now: Date, tz: string): string | null {
  if (lesson.status.startsWith('cancelled')) return t.portal.cancelled;
  const state = windowStateAt(lesson.window, now);
  if (state === 'closed' || !isOpenLesson(lesson.status)) return t.portal.closed;
  if (lesson.way_in === 'none') return t.portal.noWayIn;
  if (state === 'early') return t.portal.opensAt.replace('{time}', clockTime(new Date(lesson.window.opens_at), tz));
  // The API sends the external link only while the room is open; until the next refresh it may be missing.
  return lesson.way_in === 'external' && !lesson.meeting_url ? t.portal.noWayIn : null;
}

/**
 * «ادخل الحلقة», only inside the join window: our classroom admits the student through the API and the
 * room opens here; an external lesson opens its own meeting link (sent only while the room is open).
 */
export function LessonAction({ lesson, studentId, tz, now, onJoined }: Props) {
  const join = useMutation({ mutationFn: () => portalJoin({ studentId, lessonId: lesson.id }), onSuccess: (room) => onJoined(room) });
  const wait = waitText(lesson, now, tz);
  if (wait) return <Hint text={wait} />;
  if (lesson.way_in === 'external' && lesson.meeting_url) {
    return (
      <a href={lesson.meeting_url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: 'lg' })}>
        {t.portal.join}
      </a>
    );
  }
  return (
    <div className="grid gap-2">
      {join.isError && <FormAlert>{classroomErrorText(join.error)}</FormAlert>}
      <Button type="button" size="lg" disabled={join.isPending} onClick={() => join.mutate()}>
        {join.isPending ? t.portal.joining : t.portal.join}
      </Button>
    </div>
  );
}
