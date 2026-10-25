import { teacherName, type SalesCourseView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { TeacherStep } from '@/booking/trial/components/TeacherStep';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { Button } from '@/core/ui/primitives/Button';

export interface CourseTeacherStepProps {
  student: SalesCourseView['student'];
  onPick: (teacher: { id: string; name: string }) => void;
  /** «سجّل التحويل البنكي»: the days later, the transfer now (from «احفظ الاشتراك»). */
  transfer?: (() => void) | undefined;
}

/** The course's teacher: filtered by the student's program and teacher-gender preference first. */
export function CourseTeacherStep({ student, onPick, transfer }: CourseTeacherStepProps) {
  const [filter, setFilter] = useState({ program: student.program, gender: student.teacher_gender_pref });
  return (
    <View style={{ gap: 12 }}>
      {transfer ? <Button variant="secondary" label={t.salesMoney.stepTransfer} onPress={transfer} /> : null}
      <TeacherStep
        {...filter}
        onFilter={(f) => setFilter((old) => ({ ...old, ...f }))}
        onPick={(option) => onPick({ id: option.id, name: teacherName(option, locale) })}
      />
    </View>
  );
}
