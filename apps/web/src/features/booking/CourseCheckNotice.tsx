import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { lessonErrorText } from '@/features/schedule/api';
import { ConflictNotice } from '@/features/schedule/ConflictNotice';
import { t } from '@/lib/i18n';
import type { BookingDraft } from './draft';
import type { SeriesCheckResult } from './SeriesCheck';

export interface CourseCheckNoticeProps {
  draft: BookingDraft;
  series: SeriesCheckResult;
  /** «اختر موعدًا آخر»: back to the slot step. */
  onChangeSlot: () => void;
}

/**
 * The assistant's course on the review step (owner 2026-10-18): why «احجز» is not offered. A clash in
 * any week lists the clashes, a failed check its error, each with only «اختر موعدًا آخر» (she never
 * books over a clash: no reason, no override). Nothing while the check is clean.
 */
export function CourseCheckNotice({ draft, series, onChangeSlot }: CourseCheckNoticeProps) {
  const { body, check } = series;
  if (!body) return null;
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
  if (!check.data) return <p className="text-xs text-ink-3">{t.booking.seriesChecking}</p>;
  const conflicts = Array.isArray(check.data.conflicts) ? check.data.conflicts : [];
  if (conflicts.length === 0) return null;
  return <ConflictNotice conflicts={conflicts} teacherTz={draft.teacher?.tz} onChangeSlot={onChangeSlot} />;
}
