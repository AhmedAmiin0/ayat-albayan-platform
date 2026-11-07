import type { LessonRow } from '@ab/client-core';
import { Icon } from '@/components/ui/display/icon';
import { Field } from '@/components/ui/form/field';
import { IconButton } from '@/components/ui/form/icon-button';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import type { RowBounds } from './row-window';

export interface LessonRowFieldsProps {
  /** 0-based: «اليوم 1» … */
  index: number;
  row: LessonRow;
  bounds: RowBounds;
  onChange: (patch: Partial<LessonRow>) => void;
  /** The admin's extra day: removable; a course's rows are fixed. */
  onRemove?: (() => void) | undefined;
  /** The date's error (the same weekday twice, or not in one week). */
  dateError?: string | undefined;
  /** «بتوقيتك …، عند المعلم/ة …» once the time is set. */
  beside: string;
  /** The row's notice (RowNotice) once both are set. */
  children?: React.ReactNode;
}

/**
 * One lesson day: a native date input (min/max: the bounds the API books) and a native time input
 * in the student's zone (rule 6: picked, never free text), labelled, LTR values in the RTL page.
 */
export function LessonRowFields(props: LessonRowFieldsProps) {
  const { index, row, bounds, onChange, onRemove, dateError, beside, children } = props;
  const legend = t.lessonTimes.row.replace('{n}', String(index + 1));
  return (
    <fieldset className="grid gap-2 rounded-md border border-rule p-3">
      <legend className="px-1 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-[160px] flex-1">
          <Field label={t.lessonTimes.date} required error={dateError}>
            {(p) => (
              <Input
                {...p}
                type="date"
                dir="ltr"
                min={bounds.min}
                max={bounds.max}
                value={row.date}
                onChange={(e) => onChange({ date: e.target.value })}
                required
              />
            )}
          </Field>
        </div>
        <div className="min-w-[130px] flex-1">
          <Field label={t.lessonTimes.time} required hint={beside || undefined}>
            {(p) => (
              <Input
                {...p}
                type="time"
                dir="ltr"
                value={row.time}
                onChange={(e) => onChange({ time: e.target.value })}
                required
              />
            )}
          </Field>
        </div>
        {onRemove && (
          <IconButton label={t.booking.removeDay.replace('{day}', legend)} className="mt-6 sm:size-11" onClick={onRemove}>
            <Icon name="x" />
          </IconButton>
        )}
      </div>
      {children}
    </fieldset>
  );
}
