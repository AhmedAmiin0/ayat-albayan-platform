import { teacherName, type BookingTeacherOption, type Gender, type Program } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { TeacherStep } from '@/booking/TeacherStep';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';

export interface TrialTeacherPickProps {
  /** The last trial's teacher, kept with one tap; null when the student never had one. */
  current: { id: string; name: string } | null;
  /** The student's program, the filter's start (quran when unknown). */
  program: Program;
  /** The student's teacher-gender preference (history.teacher_gender_pref), the filter's start. */
  gender?: Gender | null | undefined;
  onKeep: () => void;
  onPick: (teacher: { id: string; name: string }) => void;
}

/**
 * Step 1: «متابعة مع {teacher}» for the last trial's teacher (pre-selected), or another from the
 * booking's own teacher step (the same program / gender filters and «غير متاح» rows).
 */
export function TrialTeacherPick({ current, program, gender = null, onKeep, onPick }: TrialTeacherPickProps) {
  const { color } = useTheme();
  const [filter, setFilter] = useState<{ program: Program; gender: Gender | null }>({ program, gender });
  const pick = (o: BookingTeacherOption) => onPick({ id: o.id, name: teacherName(o, locale) });
  return (
    <View style={{ gap: 12 }}>
      {current ? (
        <View style={{ gap: 6 }}>
          <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 }}>
            {t.trialDate.lastTeacher}
          </AppText>
          <Button label={t.booking.mobile.keepTeacher.replace('{teacher}', current.name)} onPress={onKeep} />
        </View>
      ) : null}
      <TeacherStep {...filter} onFilter={(f) => setFilter((old) => ({ ...old, ...f }))} onPick={pick} />
    </View>
  );
}
