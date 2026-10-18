import { counted } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { conflictsOf, lessonErrorText } from '@/features/schedule/api';
import { ConflictNotice } from '@/features/schedule/ConflictNotice';
import { dateLabel } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';
import { useBookingMode } from '../mode';
import { pickedText } from '../SlotStep';
import { changeCourse, courseChangeCheckQuery, type CourseChangeBody } from './api';
import { refreshAfterCourseChange } from './refresh';

export interface ChangeReviewProps {
  body: CourseChangeBody;
  /** The course's zone (the family's wall clock). */
  tz: string;
  /** «اختر موعدًا آخر»: back to the slot grid. */
  onChangeSlot: () => void;
  onDone: (message: string) => void;
}

const OVERRIDE = { override: t.booking.courseChange.overrideSave, reason: t.booking.courseChange.overrideReason };

/**
 * «تغيير أيام الحلقات», step 2 (owner 2026-10-18): POST …/change/check, then what is left
 * («تبقى 5 حلقات»), the new last lesson and the first new one, and «احفظ الأيام الجديدة». A clash
 * lists it with «اختر موعدًا آخر»; only the admin may save over it, with a reason (R-SCH-04).
 */
export function ChangeReview({ body, tz, onChangeSlot, onDone }: ChangeReviewProps) {
  const mode = useBookingMode();
  const queryClient = useQueryClient();
  const check = useQuery(courseChangeCheckQuery(body, mode));
  const save = useMutation({
    mutationFn: (override?: string) => changeCourse(override ? { ...body, override: { reason: override } } : body, mode),
    onSuccess: async () => {
      await refreshAfterCourseChange(queryClient, mode);
      onDone(t.booking.courseChange.done);
    },
  });
  if (check.isError) {
    return (
      <FormAlert>
        {lessonErrorText(check.error)}
        <Button type="button" variant="secondary" size="sm" className="ms-3" onClick={onChangeSlot}>
          {t.booking.changeSlot}
        </Button>
      </FormAlert>
    );
  }
  if (!check.data) return <p className="text-sm text-ink-3">{t.booking.courseChange.checking}</p>;
  const clashes = check.data.conflicts.length > 0 ? check.data.conflicts : null;
  const conflicts = conflictsOf(save.error) ?? clashes;
  return (
    <section aria-label={t.booking.courseChange.review} className="grid gap-4">
      <ul role="status" className="grid gap-1 rounded-md bg-sunk px-3.5 py-2.5 text-sm tabular-nums">
        <li className="font-semibold">{counted(t.booking.courseChange.remaining, check.data.remaining)}</li>
        <li>{t.booking.courseChange.newEnd.replace('{date}', dateLabel(check.data.endsOn))}</li>
        <li>{t.booking.courseChange.firstNew.replace('{when}', pickedText(body.startsAt, tz))}</li>
      </ul>
      {conflicts ? (
        <ConflictNotice
          conflicts={conflicts}
          busy={save.isPending}
          labels={OVERRIDE}
          onChangeSlot={onChangeSlot}
          onOverride={mode === 'admin' ? (reason) => save.mutate(reason) : undefined}
        />
      ) : (
        save.isError && <FormAlert>{lessonErrorText(save.error)}</FormAlert>
      )}
      <div className="flex flex-wrap justify-end gap-2.5 border-t border-rule pt-4">
        <Button type="button" variant="ghost" onClick={onChangeSlot}>
          {t.booking.back}
        </Button>
        {!conflicts && (
          <Button type="button" disabled={save.isPending} onClick={() => save.mutate(undefined)}>
            {save.isPending ? t.booking.courseChange.submitting : t.booking.courseChange.submit}
          </Button>
        )}
      </div>
    </section>
  );
}
