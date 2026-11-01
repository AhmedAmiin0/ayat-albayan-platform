import { GENDERS, PROGRAMS, type BookingTeacherOption, type Gender, type Program } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { FormAlert } from '@/components/ui/form/form-alert';
import { SegmentedControl } from '@/components/ui/form/segmented-control';
import { t } from '@/lib/i18n/i18n';
import { bookingTeachersQuery } from '@/features/teaching/booking/api';
import { useBookingMode } from '@/features/teaching/booking/mode';
import { TeacherOption } from './TeacherOption';

export interface TeacherStepProps {
  program: Program;
  genderPref: Gender | null;
  teacher: BookingTeacherOption | null;
  onChange: (patch: { program?: Program; genderPref?: Gender | null; teacher?: BookingTeacherOption | null }) => void;
  /** A calendar gap's teacher: picked once the options load, unless filtered out or unavailable. */
  hintId?: string | undefined;
}

/** Preselects the hinted teacher once per visit to the step, only while nobody is picked. */
function useHintedTeacher(p: TeacherStepProps, options: readonly BookingTeacherOption[] | undefined): void {
  const done = useRef(false);
  const { hintId, teacher, onChange } = p;
  useEffect(() => {
    if (done.current || !hintId || teacher || !options) return;
    done.current = true;
    const match = options.find((o) => o.id === hintId && o.has_availability);
    if (match) onChange({ teacher: match });
  }, [hintId, teacher, options, onChange]);
}

type GenderChip = Gender | 'any';
const GENDER_CHIPS: { value: GenderChip; label: string }[] = [
  { value: 'any', label: t.booking.genderAny },
  ...GENDERS.map((g) => ({ value: g, label: t.teachers.genderLabel[g] })),
];
const PROGRAM_CHIPS = PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] }));

/**
 * Step 2 (R-SCH-06): teachers filtered by program and gender preference, with their load. A
 * teacher with no weekly availability is shown «مش متاح» with the reason, never hidden.
 */
export function TeacherStep(props: TeacherStepProps) {
  const { program, genderPref, teacher, onChange } = props;
  const teachers = useQuery(bookingTeachersQuery({ program, gender: genderPref }, useBookingMode()));
  useHintedTeacher(props, teachers.data);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="grid gap-1.5">
          <span aria-hidden="true" className="text-xs font-semibold text-ink-2">{t.booking.program}</span>
          <SegmentedControl
            label={t.booking.program}
            className="flex-wrap"
            options={PROGRAM_CHIPS}
            value={program}
            onChange={(next) => onChange({ program: next, teacher: null })}
          />
        </div>
        <div className="grid gap-1.5">
          <span aria-hidden="true" className="text-xs font-semibold text-ink-2">{t.booking.genderPref}</span>
          <SegmentedControl
            label={t.booking.genderPref}
            className="flex-wrap"
            options={GENDER_CHIPS}
            value={genderPref ?? 'any'}
            onChange={(next) => onChange({ genderPref: next === 'any' ? null : next, teacher: null })}
          />
        </div>
      </div>
      {teachers.isError && <FormAlert>{t.common.error}</FormAlert>}
      {teachers.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      {teachers.data?.length === 0 && <p className="text-sm text-ink-2">{t.booking.noTeachers}</p>}
      {teachers.data && teachers.data.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t.booking.pickTeacher}</legend>
          <ul className="grid gap-2 sm:grid-cols-2">
            {teachers.data.map((option) => (
              <li key={option.id}>
                <TeacherOption
                  option={option}
                  checked={teacher?.id === option.id}
                  onPick={() => onChange({ teacher: option })}
                />
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </div>
  );
}
