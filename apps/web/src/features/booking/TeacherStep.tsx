import { GENDERS, PROGRAMS, type BookingTeacherOption, type Gender, type Program } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { FormAlert } from '@/components/ui/form-alert';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { t } from '@/lib/i18n';
import { bookingTeachersQuery } from './api';
import { TeacherOption } from './TeacherOption';

export interface TeacherStepProps {
  program: Program;
  genderPref: Gender | null;
  teacher: BookingTeacherOption | null;
  onChange: (patch: { program?: Program; genderPref?: Gender | null; teacher?: BookingTeacherOption | null }) => void;
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
export function TeacherStep({ program, genderPref, teacher, onChange }: TeacherStepProps) {
  const teachers = useQuery(bookingTeachersQuery({ program, gender: genderPref }));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <SegmentedControl
          label={t.booking.program}
          options={PROGRAM_CHIPS}
          value={program}
          onChange={(next) => onChange({ program: next, teacher: null })}
        />
        <SegmentedControl
          label={t.booking.genderPref}
          options={GENDER_CHIPS}
          value={genderPref ?? 'any'}
          onChange={(next) => onChange({ genderPref: next === 'any' ? null : next, teacher: null })}
        />
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
