import { counted, type BookingResult } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { conflictsOf, LESSONS_KEY } from '@/features/schedule/api';
import { ConflictNotice } from '@/features/schedule/ConflictNotice';
import { t } from '@/lib/i18n';
import { createBooking } from './api';
import { effectiveByday, toBookingRequest, type BookingDraft } from './draft';
import { PackagePrice } from './PackageStep';
import { pickedText } from './SlotStep';

export interface ReviewStepProps {
  draft: BookingDraft;
  onMeetingLink: (link: string) => void;
  /** «اختار ميعاد تاني» after a conflict: back to the slot step. */
  onChangeSlot: () => void;
  onBooked: (result: BookingResult) => void;
}

const weekday: Record<string, string> = t.enums.weekday;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-rule py-2.5 sm:grid-cols-[140px_minmax(0,1fr)]">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/**
 * Step 5 (R-SCH-06): everything that will be created, the optional link, then «احجز». A 409 lists
 * the conflicts in Arabic with «اختار ميعاد تاني» or «احجز رغم التعارض» + reason (R-SCH-04).
 */
export function ReviewStep({ draft, onMeetingLink, onChangeSlot, onBooked }: ReviewStepProps) {
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
  const days = effectiveByday(draft);
  const names = draft.students.length > 0 ? draft.students.map((s) => s.name) : [draft.newStudent?.name ?? ''];

  return (
    <div className="grid gap-5">
      <dl>
        <Row label={t.schedule.students}>{names.join(' و ')}</Row>
        <Row label={t.schedule.teacher}>{draft.teacher?.display_name_ar}</Row>
        <Row label={t.schedule.time}>
          {draft.startsAt && t.booking.firstLesson.replace('{when}', pickedText(draft.startsAt, draft.tz))}
        </Row>
        <Row label={t.booking.pickDays}>
          {days.map((d) => weekday[String(d)]).join(t.teachers.listSeparator)} ({counted(t.booking.perWeek, days.length)})
        </Row>
        <Row label={t.schedule.duration}>{t.enums.duration[draft.durationMin]}</Row>
        <Row label={t.booking.pickPackage}>
          {t.enums.packageSize[draft.pkg]} ·{' '}
          <PackagePrice
            input={{ pkg: draft.pkg, durationMin: draft.durationMin, country: draft.country, students: Math.max(1, draft.students.length) }}
          />
        </Row>
      </dl>
      <div className="sm:max-w-[460px]">
        <Field label={t.booking.meetingLink} hint={t.booking.meetingLinkHint}>
          {(p) => (
            <Input {...p} type="url" dir="ltr" value={draft.meetingLink} onChange={(e) => onMeetingLink(e.target.value)} />
          )}
        </Field>
      </div>
      <p className="text-xs text-ink-3">{t.booking.confirmationNote}</p>
      {conflicts ? (
        <ConflictNotice
          conflicts={conflicts}
          busy={book.isPending}
          onChangeSlot={onChangeSlot}
          onOverride={(reason) => book.mutate(reason)}
        />
      ) : (
        book.isError && <FormAlert>{t.common.error}</FormAlert>
      )}
      {!conflicts && (
        <div className="flex justify-end">
          <Button type="button" size="lg" disabled={book.isPending} onClick={() => book.mutate(undefined)}>
            {book.isPending ? t.booking.submitting : t.booking.submit}
          </Button>
        </div>
      )}
    </div>
  );
}
