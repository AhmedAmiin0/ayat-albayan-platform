import { dateText } from '@ab/shared';
import { Icon, type IconName } from '@ab/web-kit/components/ui/display/icon';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { MAX_OFFSET, type Week } from './use-week';

const WEEK_WORD: readonly (() => string)[] = [
  () => t.portal.app.schedule.thisWeek,
  () => t.portal.app.schedule.nextWeek,
  () => t.portal.app.schedule.laterWeek,
];

const DAY_MONTH = { day: 'numeric', month: 'long' } as const;
const dayText = (day: string) =>
  dateText(new Date(`${day}T12:00:00Z`), { tz: 'UTC', locale }, DAY_MONTH);

interface StepProps {
  label: string;
  icon: IconName;
  disabled: boolean;
  onClick: () => void;
}

/** A round step button of the week pill (44 px), named by its words. */
function Step({ label, icon, disabled, onClick }: StepProps) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      className="grid size-11 shrink-0 place-items-center rounded-full border border-fam-mint-rule
        bg-fam-mint text-fam-mint-ink transition-colors hover:not-disabled:brightness-95
        disabled:cursor-not-allowed disabled:border-rule disabled:bg-sunk disabled:text-ink-3">
      <Icon name={icon} />
    </button>
  );
}

/**
 * The week pill (boards: PortalWebSchedule): «الأسبوع السابق» · the week's name and its days ·
 * «الأسبوع التالي», within the lessons the API sends.
 */
export function WeekBar({ week }: { week: Week }) {
  const word = WEEK_WORD[week.offset] ?? WEEK_WORD[0];
  const range = t.familyLook.pages.schedule.range
    .replace('{from}', dayText(week.range.from))
    .replace('{to}', dayText(week.range.to));
  return (
    <div className="flex w-full max-w-[360px] items-center justify-between gap-2 rounded-full
      border border-rule bg-raised p-1.5 shadow-fam-lift">
      <Step label={t.portal.app.schedule.prev} icon="chevron-right" disabled={week.offset === 0}
        onClick={() => week.setOffset(week.offset - 1)} />
      <div aria-live="polite" className="grid min-w-0 text-center">
        <p className="text-body font-extrabold text-ink">{word?.()}</p>
        <p className="text-xs text-ink-3">{range}</p>
      </div>
      <Step label={t.portal.app.schedule.next} icon="chevron-left"
        disabled={week.offset >= MAX_OFFSET} onClick={() => week.setOffset(week.offset + 1)} />
    </div>
  );
}
