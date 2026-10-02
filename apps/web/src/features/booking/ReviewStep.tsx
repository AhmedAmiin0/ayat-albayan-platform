import type { BookingResult } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { conflictsOf, lessonErrorText, LESSONS_KEY } from '@/features/schedule/api';
import { ConflictNotice } from '@/features/schedule/ConflictNotice';
import { duplicateCandidates } from '@/features/students/api';
import { t } from '@/lib/i18n';
import { createBooking } from './api';
import { toBookingRequest, type BookingDraft } from './draft';
import { DuplicateNotice } from './DuplicateNotice';
import { ReviewSummary } from './ReviewSummary';

export interface ReviewStepProps {
  draft: BookingDraft;
  onMeetingLink: (link: string) => void;
  /** «اختار ميعاد تاني» after a conflict: back to the slot step. */
  onChangeSlot: () => void;
  onBooked: (result: BookingResult) => void;
  /** Lead path duplicate: book the existing student, or create the new one anyway (force). */
  onPatch: (patch: Partial<BookingDraft>) => void;
}

/**
 * Step 5 (R-SCH-06): everything that will be created, the optional link, then «احجز». A 409 lists
 * the conflicts in Arabic with «اختار ميعاد تاني» or «احجز رغم التعارض» + reason (R-SCH-04).
 */
export function ReviewStep({ draft, onMeetingLink, onChangeSlot, onBooked, onPatch }: ReviewStepProps) {
  const queryClient = useQueryClient();
  const book = useMutation({
    mutationFn: (override?: string) => {
      const body = toBookingRequest(draft, override);
      if (!body) throw new Error('incomplete draft');
      return createBooking(body);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
      onBooked(result);
    },
  });
  const conflicts = conflictsOf(book.error);
  const duplicates = duplicateCandidates(book.error);

  return (
    <div className="grid gap-5">
      <ReviewSummary draft={draft} />
      <div className="sm:max-w-[460px]">
        <Field label={t.booking.meetingLink} hint={t.booking.meetingLinkHint}>
          {(p) => (
            <Input {...p} type="url" dir="ltr" value={draft.meetingLink} onChange={(e) => onMeetingLink(e.target.value)} />
          )}
        </Field>
      </div>
      <p className="text-xs text-ink-3">{t.booking.confirmationNote}</p>
      {duplicates && (
        <DuplicateNotice
          candidates={duplicates}
          onUse={(s) => {
            book.reset();
            onPatch({ students: [{ id: s.id, name: s.name, code: s.code }] });
          }}
          onNew={() => {
            book.reset();
            onPatch({ force: true });
          }}
        />
      )}
      {conflicts ? (
        <ConflictNotice
          conflicts={conflicts}
          teacherTz={draft.teacher?.tz}
          busy={book.isPending}
          onChangeSlot={onChangeSlot}
          onOverride={(reason) => book.mutate(reason)}
        />
      ) : (
        book.isError && !duplicates && <FormAlert>{lessonErrorText(book.error)}</FormAlert>
      )}
      {!conflicts && !duplicates && (
        <div className="flex justify-end">
          <Button type="button" size="lg" disabled={book.isPending} onClick={() => book.mutate(undefined)}>
            {book.isPending ? t.booking.submitting : t.booking.submit}
          </Button>
        </div>
      )}
    </div>
  );
}
