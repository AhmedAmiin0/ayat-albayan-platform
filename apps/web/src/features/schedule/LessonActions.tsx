import { STATUS_ROUTE_EVENTS, type LessonEvent, type LessonView, type StatusRouteEvent } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { confirmLesson, lessonErrorText, LESSONS_KEY, setLessonStatus } from './api';

export interface LessonActionsProps {
  lesson: LessonView;
  /** Toast text after a confirm / status change. */
  onDone: (message: string) => void;
  /** Admin only: open the cancel / reschedule forms. Teachers get neither (docs/10 §3 guards). */
  onCancel?: () => void;
  onReschedule?: () => void;
  /** Teacher surfaces use 48px controls (docs/07 §4). */
  size?: 'sm' | 'lg';
}

/** Outcomes before the start are refused by the API (409 not_started); only «اعتذر» is early. */
function eventsNow(lesson: LessonView, now: number): StatusRouteEvent[] {
  const started = Date.parse(lesson.starts_at) <= now;
  return STATUS_ROUTE_EVENTS.filter((e) => lesson.allowed_events.includes(e) && (started || e === 'excuse'));
}

/**
 * The lesson's next steps from `allowed_events` (R-SCH-03, R-SCH-07, R-SCH-08): confirm (the one
 * primary), the attendance outcomes, then reschedule / cancel for the admin.
 */
export function LessonActions({ lesson, onDone, onCancel, onReschedule, size = 'sm' }: LessonActionsProps) {
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

  return (
    <div className="grid gap-3">
      {error && <FormAlert>{lessonErrorText(error)}</FormAlert>}
      {lesson.allowed_events.includes('confirm') && (
        <Button type="button" size={size} disabled={busy} className="justify-self-start" onClick={() => confirm.mutate(lesson.id)}>
          {t.lessons.event.confirm}
        </Button>
      )}
      {outcomes.length > 0 && (
        <div role="group" aria-label={t.teacherDash.markAttendance} className="grid gap-1.5">
          <p className="text-xs font-semibold text-ink-3">{t.teacherDash.markAttendance}</p>
          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>
      )}
      <AdminButtons events={lesson.allowed_events} size={size} onCancel={onCancel} onReschedule={onReschedule} />
    </div>
  );
}

interface AdminButtonsProps {
  events: readonly LessonEvent[];
  size: 'sm' | 'lg';
  onCancel?: (() => void) | undefined;
  onReschedule?: (() => void) | undefined;
}

/** «تغيير الميعاد» and «إلغاء الحلقة», only where the caller opens their forms and the status allows. */
function AdminButtons({ events, size, onCancel, onReschedule }: AdminButtonsProps) {
  const reschedule = onReschedule && events.includes('reschedule');
  const cancel = onCancel && (events.includes('cancel_by_admin') || events.includes('cancel_by_teacher'));
  if (!reschedule && !cancel) return null;
  return (
    <div className="flex flex-wrap gap-2 border-t border-rule pt-3">
      {reschedule && (
        <Button type="button" variant="secondary" size={size} onClick={onReschedule}>
          {t.lessons.event.reschedule}
        </Button>
      )}
      {cancel && (
        <Button type="button" variant="danger-quiet" size={size} onClick={onCancel}>
          {t.lessons.cancelSubmit}
        </Button>
      )}
    </div>
  );
}
