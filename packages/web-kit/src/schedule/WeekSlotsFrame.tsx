import type { SlotView } from '@ab/shared';
import { addDays } from '@ab/shared';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { tzCity } from '@ab/web-kit/components/ui/form/time-zone-select';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { SlotGrid, type SlotGridProps } from '@ab/web-kit/schedule/SlotGrid';
import { dayMonthLabel } from '@ab/web-kit/schedule/tz';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';

/** One week's slot read: staff's GET /booking/slots, or the family's free starts. */
export interface SlotsRead {
  data: readonly SlotView[] | undefined;
  isError: boolean;
  /** The previous week's answer still shown while this one loads. */
  dim?: boolean;
}

export interface WeekSlotsFrameProps {
  /** Saturday of the week shown (the viewer's zone). */
  week: string;
  /** This week: no going before it. */
  first: string;
  onWeek: (week: string) => void;
  studentTz: string;
  read: SlotsRead;
  grid: Pick<SlotGridProps, 'value' | 'also' | 'onPick'>;
}

const cityOf = (tz: string) => tzCity(tz) ?? tz;

/** R-SCH-06, R-SCH-07: no past weeks, no typing (rule 6). */
export function WeekSlotsFrame(props: WeekSlotsFrameProps) {
  const { week, first, onWeek, studentTz, read, grid } = props;
  const tz = useViewerTz();
  const legend =
    studentTz === tz
      ? t.schedule.zoneNote.replace('{city}', cityOf(tz))
      : t.booking.slotLegendViewer.replace('{city}', cityOf(studentTz));
  return (
    <div className="grid gap-3">
      <div role="group" aria-label={t.booking.weekNav} className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={week <= first}
          onClick={() => onWeek(addDays(week, -7))}
        >
          <Icon name="chevron-right" />
          {t.schedule.prevWeek}
        </Button>
        <span className="px-1 text-sm font-semibold tabular-nums">
          {t.schedule.weekOf.replace('{date}', dayMonthLabel(week))}
        </span>
        <Button type="button" variant="secondary" size="sm" onClick={() => onWeek(addDays(week, 7))}>
          {t.schedule.nextWeek}
          <Icon name="chevron-left" />
        </Button>
      </div>
      <p className="text-xs text-ink-3">{legend}</p>
      <SlotsBody read={read} grid={{ ...grid, week, studentTz }} />
    </div>
  );
}

function SlotsBody({ read, grid }: { read: SlotsRead; grid: Omit<SlotGridProps, 'slots'> }) {
  if (read.isError) return <FormAlert>{t.booking.slotsError}</FormAlert>;
  if (!read.data) return <p className="py-4 text-sm text-ink-3">{t.common.loading}</p>;
  if (read.data.length === 0) return <p className="py-4 text-sm text-ink-2">{t.booking.noSlots}</p>;
  return (
    <div aria-busy={read.dim ? true : undefined} className={read.dim ? 'opacity-60' : undefined}>
      <SlotGrid {...grid} slots={read.data} />
    </div>
  );
}
