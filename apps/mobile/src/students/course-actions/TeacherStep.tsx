import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorLine } from '@/inbox';
import { useTeacherOptions } from './course-actions-api';
import { SheetLines } from './SheetLines';

/** keep: the course's own days (straight to the review), else the days step with the teacher. */
export interface TeacherPick {
  teacherId: string;
  keep: boolean;
}

interface TeacherStepProps {
  studentId: string;
  /** The course's teacher: named as the current one, never offered. */
  currentId: string;
  onPick: (pick: TeacherPick) => void;
}

/** «تغيير المعلم»'s first step (owner 2026-10-30): the new teacher, then same or new days. */
export function TeacherStep({ studentId, currentId, onPick }: TeacherStepProps) {
  const options = useTeacherOptions(studentId);
  const [picked, setPicked] = useState<string | null>(null);
  const c = t.courseActions.teacher;
  if (!options.data) {
    if (options.isError) return <ErrorLine message={t.common.error} />;
    return <SheetLines lines={[t.common.loading]} />;
  }
  const current = options.data.find((o) => o.id === currentId);
  const others = options.data.filter((o) => o.id !== currentId);
  const head = [
    ...(current ? [`${c.current}: ${current.display_name_ar}`] : []),
    c.pick,
    ...(others.length === 0 ? [c.noTeachers] : []),
  ];
  return (
    <View style={{ gap: 12 }}>
      <SheetLines lines={head} />
      {others.map((o) => (
        <Button
          key={o.id}
          variant={picked === o.id ? 'primary' : 'secondary'}
          label={o.display_name_ar}
          onPress={() => setPicked(o.id)}
        />
      ))}
      {picked ? (
        <View style={{ gap: 8 }}>
          <Button label={c.keepDays} onPress={() => onPick({ teacherId: picked, keep: true })} />
          <Button
            variant="secondary"
            label={c.changeDays}
            onPress={() => onPick({ teacherId: picked, keep: false })}
          />
        </View>
      ) : null}
    </View>
  );
}
