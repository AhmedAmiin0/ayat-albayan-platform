import type { TrialDateResult } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Field, FormAlert, Input, t } from '@ab/web-kit';
import { conflictsOf, errorCode, lessonErrorText } from '@/features/teaching/schedule';
import { ConflictNotice } from '@/features/teaching/schedule/reschedule/ConflictNotice';
import { toBookingRequest, type BookingDraft } from '@/features/teaching/booking/draft/draft';
import { useBookingMode } from '@/features/teaching/booking/mode';
import { ReviewSummary } from '@/features/teaching/booking/steps/review/ReviewSummary';
import {
  createTrialDate,
  refreshAfterTrialDate,
  TRIAL_DATES_KEY,
} from '@/features/teaching/booking/trial-date/api';
import { TrialDateNotes } from './TrialDateNotes';

export interface TrialReviewStepProps {
  draft: BookingDraft;
  /** Back to the slot step after a conflict or a past start. */
  onChangeSlot: () => void;
  onPatch: (patch: Partial<BookingDraft>) => void;
  onDone: (result: TrialDateResult) => void;
}

/** Link optional (empty uses the teacher's, hers https); only the admin may override a 409. */
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
    // trial_changed and the like: the next open builds its draft from a fresh history.
    onError: () => queryClient.invalidateQueries({ queryKey: TRIAL_DATES_KEY }),
  });
  const conflicts = conflictsOf(send.error);
  const past = errorCode(send.error) === 'date_in_past';
  const trial = draft.trialDate;
  return (
    <div className="grid gap-5">
      <ReviewSummary draft={draft} />
      {trial && <TrialDateNotes trial={trial} tz={draft.tz} />}
      <div className="sm:max-w-[460px]">
        <Field label={t.booking.meetingLink} hint={t.trialDate.meetingLinkHint}>
          {(p) => (
            <Input
              {...p}
              type="url"
              dir="ltr"
              value={draft.meetingLink}
              onChange={(e) => onPatch({ meetingLink: e.target.value })}
            />
          )}
        </Field>
      </div>
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
          <Button
            type="button"
            size="lg"
            disabled={send.isPending}
            onClick={() => send.mutate(undefined)}
          >
            {send.isPending ? t.trialDate.submitting : t.trialDate.submit}
          </Button>
        </div>
      )}
    </div>
  );
}
