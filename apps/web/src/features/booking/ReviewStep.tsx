import type { BookingResult } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { conflictsOf, errorCode, lessonErrorText, LESSONS_KEY } from '@/features/schedule/api';
import { ConflictNotice } from '@/features/schedule/ConflictNotice';
import { duplicateCandidates } from '@/features/students/api';
import { t } from '@/lib/i18n';
import { createBooking } from './api';
import { CourseCheckNotice } from './CourseCheckNotice';
import { toBookingRequest, type BookingDraft } from './draft';
import { DuplicateNotice } from './DuplicateNotice';
import { useBookingMode } from './mode';
import { ReviewSummary } from './ReviewSummary';
import { isSeriesClean, useSeriesCheck } from './SeriesCheck';

const INVOICE_ERRORS = new Set(['invoice_required', 'invoice_type', 'invoice_too_large', 'invoice_path', 'invoice_message', 'media_expired']);

export interface ReviewStepProps {
  draft: BookingDraft;
  onMeetingLink: (link: string) => void;
  /** «اختر موعدًا آخر» after a conflict: back to the slot step. */
  onChangeSlot: () => void;
  /** An invoice error (required, wrong file, expired chat media): back to the invoice step. */
  onInvoice: () => void;
  onBooked: (result: BookingResult) => void;
  /** Lead path duplicate: book the existing student, or create the new one anyway (force). */
  onPatch: (patch: Partial<BookingDraft>) => void;
}

/**
 * Step 5 (R-SCH-06): everything that will be created, the optional link, then «احجز». A 409 lists
 * the conflicts in Arabic with «اختار ميعاد تاني» or «احجز رغم التعارض» + reason (R-SCH-04). The
 * assistant (sales mode) has no link and no override; her course books only over a clean series check.
 */
export function ReviewStep({ draft, onMeetingLink, onChangeSlot, onInvoice, onBooked, onPatch }: ReviewStepProps) {
  const queryClient = useQueryClient();
  const mode = useBookingMode();
  const book = useMutation({
    mutationFn: (override?: string) => {
      const body = toBookingRequest(draft, override);
      if (!body) throw new Error('incomplete draft');
      return createBooking(body, mode);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
      onBooked(result);
    },
  });
  // The assistant's course books only over a clean series check: she never books over a clash. Only
  // a course asks here (the admin's 409 lists the clashes), so «رابط الحلقة» never re-checks.
  const course = draft.course !== null;
  const series = useSeriesCheck(draft, course);
  const clean = isSeriesClean(series);
  const failed = course && (series.check.isError || (series.check.data !== undefined && !clean));
  const conflicts = conflictsOf(book.error);
  const duplicates = duplicateCandidates(book.error);
  // A missing, wrong or expired invoice is fixed on the invoice step, not here.
  const backToInvoice = INVOICE_ERRORS.has(errorCode(book.error) ?? '');
  // The first lesson passed while the review was open (or in a resumed draft): back to the slot step.
  const past = errorCode(book.error) === 'date_in_past';

  return (
    <div className="grid gap-5">
      <ReviewSummary draft={draft} />
      {mode === 'admin' && (
        <div className="sm:max-w-[460px]">
          <Field label={t.booking.meetingLink} hint={t.booking.meetingLinkHint}>
            {(p) => (
              <Input {...p} type="url" dir="ltr" value={draft.meetingLink} onChange={(e) => onMeetingLink(e.target.value)} />
            )}
          </Field>
        </div>
      )}
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
          onOverride={mode === 'admin' && !course ? (reason) => book.mutate(reason) : undefined}
        />
      ) : (
        book.isError && !duplicates && (
          <FormAlert>
            {past ? t.booking.firstLessonPast : lessonErrorText(book.error)}
            {past && (
              // The past start is dropped first, so «التالي» cannot lead back to the same refusal.
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
            {backToInvoice && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="ms-3"
                onClick={() => {
                  book.reset();
                  onInvoice();
                }}
              >
                {t.booking.invoice.upload}
              </Button>
            )}
          </FormAlert>
        )
      )}
      {course && !conflicts && <CourseCheckNotice draft={draft} series={series} onChangeSlot={onChangeSlot} />}
      {!conflicts && !duplicates && !failed && (
        <div className="flex justify-end">
          <Button type="button" size="lg" disabled={book.isPending || (course && !clean)} onClick={() => book.mutate(undefined)}>
            {book.isPending ? t.booking.submitting : t.booking.submit}
          </Button>
        </div>
      )}
    </div>
  );
}
