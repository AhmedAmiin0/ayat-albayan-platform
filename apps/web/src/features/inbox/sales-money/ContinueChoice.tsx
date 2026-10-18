import type { SalesCourseView } from '@ab/shared';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { continueText } from './course-continue';

export interface ContinueChoiceProps {
  view: SalesCourseView;
  /** «تابِع بنفس الأيام»: the wizard opens with the previous teacher and days picked. */
  onContinue: () => void;
  /** «اختر أيامًا أخرى»: the empty picker, on the same opening week. */
  onOther: () => void;
}

/**
 * A renewal's first question (owner 2026-10-18), inside «أيام الحلقات» before the wizard: the
 * previous course's days and the new start, then continue on them (primary) or pick other days.
 */
export function ContinueChoice({ view, onContinue, onOther }: ContinueChoiceProps) {
  return (
    <div className="grid gap-4">
      <p className="rounded-md bg-sunk px-3.5 py-2.5 text-sm tabular-nums">{continueText(view)}</p>
      <div className="flex flex-wrap gap-2.5">
        <Button type="button" onClick={onContinue}>
          {t.booking.courseChange.continueSameDays}
        </Button>
        <Button type="button" variant="secondary" onClick={onOther}>
          {t.booking.courseChange.pickOtherDays}
        </Button>
      </div>
    </div>
  );
}
