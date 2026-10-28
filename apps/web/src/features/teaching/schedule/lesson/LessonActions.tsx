import { canJoinNow, isOpenLesson, STATUS_ROUTE_EVENTS, type LessonEvent, type LessonView, type StatusRouteEvent } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { ButtonRow } from '@/components/ui/layout/button-row';
import { useJoinWindow } from '@/lib/settings/public-config';
import { t } from '@/lib/i18n/i18n';
import { confirmLesson, lessonErrorText, LESSONS_KEY, setLessonStatus } from '../api';

export interface LessonActionsProps {
  lesson: LessonView;
  /** Toast text after a confirm / status change. */
  onDone: (message: string) => void;
  /** Admin only: open the cancel / reschedule forms. Teachers get neither (docs/10 §3 guards). */
  onCancel?: () => void;
  onReschedule?: () => void;
  /** Admin: «تغيير أيام الحلقات» of the lesson's assistant course (course_subscription_id). */
  onChangeCourse?: () => void;
  /** 48px on phones either way (docs/07 «الأزرار»); teacher surfaces keep 48px on desktop too. */
  size?: 'md' | 'lg';
}

/** Outcomes before the start are refused by the API (409 not_started); only «اعتذر» is early. */
function eventsNow(lesson: LessonView, now: number): StatusRouteEvent[] {
  const started = Date.parse(lesson.starts_at) <= now;
  return STATUS_ROUTE_EVENTS.filter((e) => lesson.allowed_events.includes(e) && (started || e === 'excuse'));
}

/**
 * The lesson's next steps from `allowed_events` (R-SCH-03, R-SCH-07, R-SCH-08), docs/07 «الأزرار»: confirm
 * full width (the one primary; a secondary while «ادخل الحلقة» is live above it), the attendance outcomes
 * as one ButtonRow, then the admin's ButtonRow «تغيير الميعاد» | «تغيير أيام الحلقات» | «إلغاء الحلقة» (danger).
 */
export function LessonActions({ lesson, onDone, onCancel, onReschedule, onChangeCourse, size = 'md' }: LessonActionsProps) {
  const queryClient = useQueryClient();
  const [now] = useState(() => Date.now());
  const done = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
    onDone(message);
  };
  const confirm = useMutation({ mutationFn: confirmLesson, onSuccess: () => done(t.lessons.confirmed) });
  const status = useMutation({ mutationFn: setLessonStatus, onSuccess: () => done(t.lessons.statusSaved) });
  const busy = confirm.isPending || status.isPending;
  const error = confirm.error ?? status.error;
  const outcomes = eventsNow(lesson, now);
  const joinLive = isOpenLesson(lesson.status) && canJoinNow(lesson, new Date(now), useJoinWindow());

  return (
    <div className="grid gap-3">
      {error && <FormAlert>{lessonErrorText(error)}</FormAlert>}
      {lesson.allowed_events.includes('confirm') && (
        <Button
          type="button"
          variant={joinLive ? 'secondary' : 'primary'}
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

interface AdminButtonsProps {
  events: readonly LessonEvent[];
  size: 'md' | 'lg';
  onCancel?: (() => void) | undefined;
  onReschedule?: (() => void) | undefined;
  /** Only for a lesson of an assistant course. */
  onChangeCourse?: (() => void) | undefined;
}

/** One ButtonRow: «غيّر الميعاد» (its caption under the row says what it does: closes this lesson, opens a new one, can cover the series), «تغيير أيام الحلقات» of a course and «إلغاء الحلقة» (danger), only where the caller opens their forms and the status allows. */
function AdminButtons({ events, size, onCancel, onReschedule, onChangeCourse }: AdminButtonsProps) {
  const reschedule = onReschedule && events.includes('reschedule');
  const course = onChangeCourse && events.includes('reschedule');
  const cancel = onCancel && (events.includes('cancel_by_admin') || events.includes('cancel_by_teacher'));
  if (![reschedule, course, cancel].some(Boolean)) return null;
  return (
    <div className="grid gap-1.5 border-t border-rule pt-3">
      <ButtonRow>
        {reschedule && (
          <Button type="button" variant="secondary" size={size} onClick={onReschedule}>
            {t.lessons.event.reschedule}
          </Button>
        )}
        {course && (
          <Button type="button" variant="secondary" size={size} onClick={onChangeCourse}>
            {t.booking.courseChange.changeDays}
          </Button>
        )}
        {cancel && (
          <Button type="button" variant="danger-quiet" size={size} onClick={onCancel}>
            {t.lessons.cancelSubmit}
          </Button>
        )}
      </ButtonRow>
      {reschedule && <span className="text-xs text-ink-3">{t.lessons.timeEdit.captionReschedule}</span>}
    </div>
  );
}
