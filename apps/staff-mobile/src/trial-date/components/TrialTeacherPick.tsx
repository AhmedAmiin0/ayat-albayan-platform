import type { Gender, Program } from '@ab/catalog';
import { teacherName, type BookingTeacherOption } from '@ab/schedule';
import { useState } from 'react';
import { View } from 'react-native';
import { TeacherStep } from '@/booking/trial/components/TeacherStep';
import { t, locale, type, useTheme, AppText, Button } from '@ab/mobile-kit';

interface TrialTeacherPickProps {
  /** The last trial's teacher, kept with one tap; null when the student never had one. */
  current: { id: string; name: string } | null;
  /** The student's program, the filter's start (quran when unknown). */
  program: Program;
  /** The student's teacher-gender preference (history.teacher_gender_pref), the filter's start. */
  gender?: Gender | null | undefined;
  onKeep: () => void;
  onPick: (teacher: { id: string; name: string }) => void;
}

/** The last trial's teacher is preselected; others use the booking's filters. */
export function TrialTeacherPick({
  current,
  program,
  gender = null,
  onKeep,
  onPick,
}: TrialTeacherPickProps) {
  const { color } = useTheme();
  const [filter, setFilter] = useState<{ program: Program; gender: Gender | null }>({
    program,
    gender,
  });
  const pick = (o: BookingTeacherOption) => onPick({ id: o.id, name: teacherName(o, locale) });
  return (
    <View style={{ gap: 12 }}>
      {current ? (
        <View style={{ gap: 6 }}>
          <AppText
            style={{
              fontFamily: type.ui[500],
              fontSize: type.size.sm,
              lineHeight: type.lineHeight(type.size.sm),
              color: color.ink2,
            }}
          >
            {t.trialDate.lastTeacher}
          </AppText>
          <Button label={t.booking.mobile.keepTeacher.replace('{teacher}', current.name)} onPress={onKeep} />
        </View>
      ) : null}
      <TeacherStep
        {...filter}
        onFilter={(f) => setFilter((old) => ({ ...old, ...f }))}
        onPick={pick}
      />
    </View>
  );
}
