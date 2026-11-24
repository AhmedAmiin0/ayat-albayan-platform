import { useState } from 'react';
import { View } from 'react-native';
import { t, Button, ErrorLine } from '@ab/mobile-kit';
import { useTeacherOptions } from './course-actions-api';
import { SheetLines } from './SheetLines';

/** keep: the course's own days (straight to the review), else the days step with the teacher. */
export interface TeacherPick {
  teacherId: string;
  keep: boolean;
  lines: string[];
}

interface TeacherStepProps {
  studentId: string;
  /** The course's teacher: named as the current one, never offered. */
  currentId: string;
  onPick: (pick: TeacherPick) => void;
}

interface Option {
  id: string;
  display_name_ar: string;
}

function pickLines(current: Option | undefined, picked: Option | undefined): string[] {
  const c = t.courseActions.teacher;
  const now = current ? [c.reviewCurrent.replace('{name}', current.display_name_ar)] : [];
  return [...now, c.reviewNew.replace('{name}', picked?.display_name_ar ?? '')];
}

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
  const lines = pickLines(current, others.find((o) => o.id === picked));
  const pick = (keep: boolean) => (picked ? onPick({ teacherId: picked, keep, lines }) : undefined);
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
          <Button label={c.keepDays} onPress={() => pick(true)} />
          <Button variant="secondary" label={c.changeDays} onPress={() => pick(false)} />
        </View>
      ) : null}
    </View>
  );
}
