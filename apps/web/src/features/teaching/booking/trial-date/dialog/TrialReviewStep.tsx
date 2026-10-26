import type { TrialDateResult } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { conflictsOf, errorCode, lessonErrorText } from '@/features/teaching/schedule/api';
import { ConflictNotice } from '@/features/teaching/schedule/reschedule/ConflictNotice';
import { t } from '@/lib/i18n/i18n';
import { toBookingRequest, type BookingDraft } from '../../draft/draft';
import { useBookingMode } from '../../mode';
import { ReviewSummary } from '../../steps/review/ReviewSummary';
import { createTrialDate, refreshAfterTrialDate, TRIAL_DATES_KEY } from '../api';
import { TrialDateNotes } from './TrialDateNotes';

export interface TrialReviewStepProps {
  draft: BookingDraft;
  /** «اختر موعدًا آخر» after a conflict or a past start: back to the slot step. */
  onChangeSlot: () => void;
  onPatch: (patch: Partial<BookingDraft>) => void;
  onDone: (result: TrialDateResult) => void;
}

/**
 * The review of «موعد تجريبي جديد» (R-SCH-06, R-ASST-01): the booking's summary (time in Riyadh and
 * the family's zone, teacher), what happens to the upcoming trial, the warning from the 3rd date, then
 * POST {base}/trial-date with the draft's request id. A 409 lists the clashes; the admin may book over
 * them with a reason (as booking), the assistant never.
 */
export function TrialReviewStep({ draft, onChangeSlot, onPatch, onDone }: TrialReviewStepProps) {
  const queryClient = useQueryClient();
  const mode = useBookingMode();
  const send = useMutation({
    mutationFn: (override?: string) => {
      const body = toBookingRequest(draft, override);
      if (!body) throw new Error('incomplete draft');
      return createTrialDate(body, mode);
    },
    onSuccess: async (result) => {
      await refreshAfterTrialDate(queryClient);
      onDone(result);
    },
    // trial_changed and the like: the next open builds its draft from a fresh history, not the cache.
    onError: () => queryClient.invalidateQueries({ queryKey: TRIAL_DATES_KEY }),
  });
  const conflicts = conflictsOf(send.error);
  const past = errorCode(send.error) === 'date_in_past';
  const trial = draft.trialDate;
  return (
    <div className="grid gap-5">
      <ReviewSummary draft={draft} />
      {trial && <TrialDateNotes trial={trial} tz={draft.tz} />}
      {conflicts ? (
        <ConflictNotice
          conflicts={conflicts}
          teacherTz={draft.teacher?.tz}
          busy={send.isPending}
          onChangeSlot={onChangeSlot}
          onOverride={mode === 'admin' ? (reason) => send.mutate(reason) : undefined}
        />
      ) : (
        send.isError && (
          <FormAlert>
            {past ? t.booking.firstLessonPast : lessonErrorText(send.error)}
            {past && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="ms-3"
                onClick={() => {
                  onPatch({ startsAt: null, extra: [] });
                  onChangeSlot();
                }}
              >
                {t.booking.changeSlot}
              </Button>
            )}
          </FormAlert>
        )
      )}
      {!conflicts && (
        <div className="flex justify-end">
          <Button type="button" size="lg" disabled={send.isPending} onClick={() => send.mutate(undefined)}>
            {send.isPending ? t.trialDate.submitting : t.trialDate.submit}
          </Button>
        </div>
      )}
    </div>
  );
}
