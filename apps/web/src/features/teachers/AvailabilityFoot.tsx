import { Button } from '@/components/ui/button';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';
import { weeklyHoursLabel } from './track';

type Props = { hours: number; pending: boolean; failed: boolean; onCancel: () => void; onSave: () => void };

/**
 * Summary + إلغاء / حفظ المواعيد. حفظ stays enabled while the grid has an error: the save is
 * refused and focus moves to the first error instead (docs/07 §8).
 * TODO(R-SCH-01): «محجوز منها N حلقات» once lessons exist.
 */
export function AvailabilityFoot({ hours, pending, failed, onCancel, onSave }: Props) {
  return (
    <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
      <p className="text-xs text-ink-2 tabular-nums">{weeklyHoursLabel(hours)}</p>
      {failed && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-danger">
          <NuqtaGlyph shape="struck" />
          <span>{t.common.error}</span>
        </p>
      )}
      <div className="flex w-full gap-2.5 sm:w-auto [&>*]:max-sm:flex-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button type="button" disabled={pending} onClick={onSave}>
          {pending ? t.common.saving : t.availability.save}
        </Button>
      </div>
    </div>
  );
}
