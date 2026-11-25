import { Button, FormAlert, t } from '@ab/web-kit';
import { lessonErrorText } from '@/features/teaching/schedule';
import { ConflictNotice } from '@/features/teaching/schedule/reschedule/ConflictNotice';
import type { BookingDraft } from '@/features/teaching/booking/draft/draft';
import type { SeriesCheckResult } from './SeriesCheck';

export interface CourseCheckNoticeProps {
  draft: BookingDraft;
  series: SeriesCheckResult;
  onChangeSlot: () => void;
}

/** She never books over a clash: no reason, no override; nothing while the check is clean. */
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
