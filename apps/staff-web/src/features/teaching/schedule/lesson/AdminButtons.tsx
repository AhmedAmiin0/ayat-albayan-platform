import type { LessonEvent } from '@ab/shared';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { ButtonRow } from '@ab/web-kit/components/ui/layout/button-row';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export interface AdminButtonsProps {
  events: readonly LessonEvent[];
  size: 'md' | 'lg';
  onCancel?: (() => void) | undefined;
  onReschedule?: (() => void) | undefined;
  /** Only for a lesson of an assistant course. */
  onChangeCourse?: (() => void) | undefined;
}

const cancellable = (events: readonly LessonEvent[]) =>
  events.includes('cancel_by_admin') || events.includes('cancel_by_teacher');

/** Which buttons show: the caller opens that form and the status allows it. */
const shownOf = ({ events, ...open }: AdminButtonsProps) => ({
  reschedule: open.onReschedule !== undefined && events.includes('reschedule'),
  course: open.onChangeCourse !== undefined && events.includes('reschedule'),
  cancel: open.onCancel !== undefined && cancellable(events),
});

/** Only where the caller opens their forms and the status allows (docs/48). */
export function AdminButtons(props: AdminButtonsProps) {
  const { size, onCancel, onReschedule, onChangeCourse } = props;
  const { reschedule, course, cancel } = shownOf(props);
  if (!reschedule && !course && !cancel) return null;
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
      {reschedule && (
        <span className="text-xs text-ink-3">{t.lessons.timeEdit.captionReschedule}</span>
      )}
    </div>
  );
}
