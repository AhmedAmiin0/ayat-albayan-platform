import {
  GENDERS,
  PROGRAMS,
  teacherName,
  type BookingTeacherOption,
  type Gender,
  type Program,
} from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { FormLabel } from '@/payments/FormLabel';
import { AppText } from '@/ui/AppText';
import { ErrorState } from '@/ui/ErrorState';
import { FilterPills } from '@/ui/FilterPills';
import { ListRow } from '@/ui/ListRow';
import { type, useTheme } from '@/theme';
import { useBookingTeachers } from './queries';
import { locale } from '@/lib/locale';

export interface TeacherStepProps {
  program: Program;
  gender: Gender | null;
  onFilter: (patch: { program?: Program; gender?: Gender | null }) => void;
  onPick: (teacher: BookingTeacherOption) => void;
}

type GenderPill = Gender | 'any';
const programPills = () => PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] }));
const genderPills = (): { value: GenderPill; label: string }[] => [
  { value: 'any', label: t.booking.genderAny },
  ...GENDERS.map((g) => ({ value: g, label: t.teachers.genderLabel[g] })),
];

/** «{n} من {max} طالب», or «{n} طالب حاليًا» when the teacher has no maximum. */
export function teacherLoad(
  o: Pick<BookingTeacherOption, 'students_count' | 'max_students'>,
): string {
  const n = String(o.students_count);
  return o.max_students === null
    ? t.booking.teacherStudents.replace('{n}', n)
    : t.booking.teacherLoad.replace('{n}', n).replace('{max}', String(o.max_students));
}

/**
 * Step 2 (R-SCH-06): program + teacher-gender preference, then the matching teachers with their
 * load. One without weekly availability is shown «مش متاح» with the reason, never hidden, and
 * can't be picked. Tapping a teacher moves on to the slots.
 */
export function TeacherStep({ program, gender, onFilter, onPick }: TeacherStepProps) {
  const { color } = useTheme();
  const teachers = useBookingTeachers({ program, gender });
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 };

  return (
    <View style={{ gap: 12 }}>
      <FormLabel>{t.booking.program}</FormLabel>
      <FilterPills
        role="radiogroup"
        accessibilityLabel={t.booking.program}
        items={programPills()}
        value={program}
        onChange={(next) => onFilter({ program: next })}
      />
      <FormLabel>{t.booking.genderPref}</FormLabel>
      <FilterPills
        role="radiogroup"
        accessibilityLabel={t.booking.genderPref}
        items={genderPills()}
        value={gender ?? 'any'}
        onChange={(next) => onFilter({ gender: next === 'any' ? null : next })}
      />
      <FormLabel>{t.booking.pickTeacher}</FormLabel>
      {teachers.isError ? <ErrorState onRetry={() => void teachers.refetch()} /> : null}
      {teachers.isPending ? <AppText style={note}>{t.common.loading}</AppText> : null}
      {teachers.data?.length === 0 ? <AppText style={note}>{t.booking.noTeachers}</AppText> : null}
      <View>
        {teachers.data?.map((option) => (
          <ListRow
            key={option.id}
            title={teacherName(option, locale)}
            subtitle={option.has_availability ? teacherLoad(option) : t.booking.noAvailabilityWhy}
            trailing={
              option.has_availability ? null : (
                <AppText style={note}>{t.booking.notAvailable}</AppText>
              )
            }
            onPress={option.has_availability ? () => onPick(option) : undefined}
          />
        ))}
      </View>
    </View>
  );
}
