import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { SlotGrid } from '@ab/web-kit/schedule/SlotGrid';
import type { SlotsBodyProps } from './SlotsBody.types';

/** The week's read: its error, loading or empty note, else the grid (dimmed while refetching). */
export function SlotsBody({ read, grid }: SlotsBodyProps) {
  if (read.isError) return <FormAlert>{t.booking.slotsError}</FormAlert>;
  if (!read.data) return <p className="py-4 text-sm text-ink-3">{t.common.loading}</p>;
  if (read.data.length === 0) return <p className="py-4 text-sm text-ink-2">{t.booking.noSlots}</p>;
  return (
    <div aria-busy={read.dim ? true : undefined} className={read.dim ? 'opacity-60' : undefined}>
      <SlotGrid {...grid} slots={read.data} />
    </div>
  );
}
