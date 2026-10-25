import type { BookingTeacherOption } from '@ab/shared';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { tzCity } from '@/components/ui/form/time-zone-select';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { cn } from '@/lib/utils';

export interface TeacherOptionProps {
  option: BookingTeacherOption;
  checked: boolean;
  onPick: () => void;
}

/** «{n} من {max} طالب», or «{n} طالب حاليًا» when the teacher has no maximum. */
export function teacherLoad(o: Pick<BookingTeacherOption, 'students_count' | 'max_students'>): string {
  const n = String(o.students_count);
  return o.max_students === null
    ? t.booking.teacherStudents.replace('{n}', n)
    : t.booking.teacherLoad.replace('{n}', n).replace('{max}', String(o.max_students));
}

/** One radio card: name, gender · programs · city, load, and why the teacher can't be picked. */
export function TeacherOption({ option, checked, onPick }: TeacherOptionProps) {
  const unavailable = !option.has_availability;
  const full = option.max_students !== null && option.students_count >= option.max_students;
  const meta = [
    t.teachers.genderLabel[option.gender],
    option.programs.map((p) => t.enums.program[p]).join(t.common.listSeparator),
    tzCity(option.tz) ?? option.tz,
  ].join(t.common.listSeparator);

  return (
    <label
      className={cn(
        'ab-lift flex min-h-11 cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5',
        checked ? 'border-lapis bg-accent' : 'border-rule hover:bg-sunk',
        unavailable && 'cursor-not-allowed bg-sunk/60 hover:bg-sunk/60',
      )}
    >
      <input
        type="radio"
        name="booking-teacher"
        checked={checked}
        disabled={unavailable}
        onChange={onPick}
        className="mt-1.5 size-4 accent-[var(--lapis)]"
      />
      <span className="grid min-w-0 gap-0.5">
        <span className={cn('font-semibold', unavailable && 'text-ink-3')}>{teacherLabel(option)}</span>
        <span className="text-xs text-ink-3">{meta}</span>
        <span className="text-xs text-ink-2 tabular-nums">
          {teacherLoad(option)}
          {full && ` · ${t.booking.atCapacity}`}
        </span>
        {unavailable && (
          <span className="flex items-center gap-1.5 text-xs text-ink-2">
            <NuqtaGlyph shape="struck" />
            <span>{`${t.booking.notAvailable}: ${t.booking.noAvailabilityWhy}`}</span>
          </span>
        )}
      </span>
    </label>
  );
}
