import {
  canJoinNow,
  isOpenLesson,
  STATUS_ROUTE_EVENTS,
  type LessonView,
  type StatusRouteEvent,
} from '@ab/schedule';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { ButtonRow } from '@ab/web-kit/components/ui/layout/button-row';
import { useJoinWindow, usePublicConfig } from '@ab/web-kit/lib/settings/public-config';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { confirmLesson, lessonErrorText, LESSONS_KEY, setLessonStatus } from '@/features/teaching/schedule/api';
import { AdminButtons } from '@/features/teaching/schedule/lesson/AdminButtons';

export interface LessonActionsProps {
  lesson: LessonView;
  /** Toast text after a confirm / status change. */
  onDone: (message: string) => void;
  /** Admin only: open the cancel / reschedule forms. Teachers get neither (docs/10 §3 guards). */
  onCancel?: () => void;
  onReschedule?: () => void;
  /** Admin: change the days of the lesson's assistant course (course_subscription_id). */
  onChangeCourse?: () => void;
  /** A pending proposal's accept is the primary above, so the confirm is outlined. */
  proposalLeads?: boolean;
  /** The teacher confirms her own attendance (docs/46 D1); pre-start excuses are admin-only. */
  teacher?: boolean;
  /** 48px on phones either way (docs/07); teacher surfaces keep 48px on desktop too. */
  size?: 'md' | 'lg';
}

/** The API refuses outcomes before the start (409 not_started); only excuse is early. */
function eventsNow(lesson: LessonView, at: { now: number; teacher: boolean }): StatusRouteEvent[] {
  const started = Date.parse(lesson.starts_at) <= at.now;
  const early = (e: StatusRouteEvent) => e === 'excuse' && !at.teacher;
  return STATUS_ROUTE_EVENTS.filter(
    (e) => lesson.allowed_events.includes(e) && (started || early(e)),
  );
}

/** Next steps from `allowed_events` (R-SCH-03/07/08); one primary, which steps down when needed. */
export function LessonActions(props: LessonActionsProps) {
  const { lesson, onDone, onCancel, onReschedule, onChangeCourse, size = 'md' } = props;
  const queryClient = useQueryClient();
  const done = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
    onDone(message);
  };
  const confirm = useMutation({
    mutationFn: confirmLesson,
    onSuccess: () => done(t.lessons.confirmed),
  });
  const status = useMutation({
    mutationFn: setLessonStatus,
    onSuccess: () => done(t.lessons.statusSaved),
  });
  const busy = confirm.isPending || status.isPending;
  const error = confirm.error ?? status.error;
  // The live clock (docs/48): the outcomes appear by themselves at the start minute.
  const live = useNow();
  const outcomes = eventsNow(lesson, { now: live.getTime(), teacher: props.teacher === true });
  const win = useJoinWindow();
  // No confirm while none is required; a family's yes still confirms.
  const required = usePublicConfig().lesson_confirmation_required;
  const confirmable =
    required && props.teacher !== true && lesson.allowed_events.includes('confirm');
  // One filled button: join (live clock) or a pending proposal's accept leads.
  const stepDown =
    (isOpenLesson(lesson.status) && canJoinNow(lesson, live, win)) || props.proposalLeads === true;

  return (
    <div className="grid gap-3">
      {error && <FormAlert>{lessonErrorText(error)}</FormAlert>}
      {confirmable && (
        <Button
          type="button"
          variant={stepDown ? 'secondary' : 'primary'}
          size={size}
          disabled={busy}
          className="w-full"
          onClick={() => confirm.mutate(lesson.id)}
        >
          {t.lessons.event.confirm}
        </Button>
      )}
      {outcomes.length > 0 && (
        <div role="group" aria-label={t.teacherDash.markAttendance} className="grid gap-1.5">
          <p className="text-xs font-semibold text-ink-3">{t.teacherDash.markAttendance}</p>
          <ButtonRow>
            {outcomes.map((event) => (
              <Button
                key={event}
                type="button"
                variant="secondary"
                size={size}
                disabled={busy}
                onClick={() => status.mutate({ id: lesson.id, event })}
              >
                {t.lessons.event[event]}
              </Button>
            ))}
          </ButtonRow>
        </div>
      )}
      <AdminButtons
        events={lesson.allowed_events}
        size={size}
        onCancel={onCancel}
        onReschedule={onReschedule}
        onChangeCourse={lesson.course_subscription_id ? onChangeCourse : undefined}
      />
    </div>
  );
}

