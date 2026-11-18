import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { MAX_OFFSET, type Week } from './use-week';

const WEEK_WORD: readonly (() => string)[] = [
  () => t.portal.app.schedule.thisWeek,
  () => t.portal.app.schedule.nextWeek,
  () => t.portal.app.schedule.laterWeek,
];

/** «الأسبوع السابق» · the week's name · «الأسبوع التالي», within the lessons the API sends. */
export function WeekBar({ week }: { week: Week }) {
  const word = WEEK_WORD[week.offset] ?? WEEK_WORD[0];
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-sunk p-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={week.offset === 0}
        onClick={() => week.setOffset(week.offset - 1)}
      >
        {t.portal.app.schedule.prev}
      </Button>
      <p aria-live="polite" className="text-sm font-semibold">{word?.()}</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={week.offset >= MAX_OFFSET}
        onClick={() => week.setOffset(week.offset + 1)}
      >
        {t.portal.app.schedule.next}
      </Button>
    </div>
  );
}
