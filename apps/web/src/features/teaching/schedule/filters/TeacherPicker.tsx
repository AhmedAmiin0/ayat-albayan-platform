import { counted } from '@ab/shared';
import { controlClass } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { cn } from '@/lib/utils';

export interface TeacherPickerProps {
  /** Every teacher in the overview (before the other filters). */
  teachers: readonly { id: string; display_name_ar: string; display_name_en?: string | null }[];
  /** Picked ids; empty = everyone. */
  value: readonly string[];
  onChange: (ids: string[]) => void;
  /** In the «تصفية» panel: the list opens in the flow, pushing the fields below it, instead of floating over them. */
  inline?: boolean;
}

/** «كل المعلمين», the one name picked, or «3 معلمين» (counted forms). */
export function pickedLabel(teachers: TeacherPickerProps['teachers'], value: readonly string[]): string {
  if (value.length === 0) return t.schedule.allTeachers;
  const one = value.length === 1 ? teachers.find((x) => x.id === value[0]) : undefined;
  return one ? teacherLabel(one) : counted(t.schedule.teachersPicked, value.length);
}

/**
 * Teacher multi-select (R-SCH-01) as a native disclosure: a checkbox per teacher, keyboard and
 * screen reader for free, no dependency. Unticking everyone means everyone.
 */
export function TeacherPicker({ teachers, value, onChange, inline = false }: TeacherPickerProps) {
  const toggle = (id: string, on: boolean) => onChange(on ? [...value, id] : value.filter((x) => x !== id));
  return (
    <div className="grid min-w-0 gap-1.5 sm:w-auto">
      <span className="text-xs font-semibold text-ink-2">{t.schedule.teacherFilter}</span>
      <details className="relative">
        <summary
          className={cn(
            controlClass,
            'ab-select flex cursor-pointer list-none items-center pe-8 sm:min-w-[160px] [&::-webkit-details-marker]:hidden',
          )}
        >
          <span className="sr-only">{t.schedule.teacherFilter}: </span>
          <span className="truncate">{pickedLabel(teachers, value)}</span>
        </summary>
        <fieldset
          className={cn(
            'mt-1 grid gap-0.5 overflow-y-auto rounded-md border border-rule bg-raised p-1.5',
            inline ? 'max-h-56' : 'absolute z-20 max-h-72 w-max min-w-full shadow-md',
          )}
        >
          <legend className="sr-only">{t.schedule.teacherFilter}</legend>
          {teachers.map((x) => (
            <label key={x.id} className="flex min-h-11 items-center gap-2 rounded-sm px-2 text-sm hover:bg-sunk sm:min-h-9">
              <input
                type="checkbox"
                checked={value.includes(x.id)}
                onChange={(e) => toggle(x.id, e.target.checked)}
                className="size-4 accent-[var(--lapis)]"
              />
              <span>{teacherLabel(x)}</span>
            </label>
          ))}
        </fieldset>
      </details>
    </div>
  );
}
