import { teacherChoice, type TeacherPick } from '@ab/client-core';
import type { SalesFamilyStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Field, Select, t } from '@ab/web-kit';
import { salesTeachersQuery } from '@/features/sales/sales-money/api';

/** teacherChoice (@ab/client-core) with her pick kept: the teacher to show and the body to send. */
export function useTeacherPick(students: readonly SalesFamilyStudent[], studentId: string) {
  const [pick, setPick] = useState<TeacherPick | null>(null);
  const options = useQuery(salesTeachersQuery).data;
  return {
    ...teacherChoice(students, { studentId, pick, options }),
    setTeacher: (teacherId: string) => setPick({ studentId, teacherId }),
  };
}

type Props = { value: string; onChange: (id: string) => void };

/** Defaults to the trial's teacher (students.teacher_id); teacher chat opens after subscribing. */
export function SalesTeacherField({ value, onChange }: Props) {
  const teachers = useQuery(salesTeachersQuery).data ?? [];
  return (
    <Field label={t.salesMoney.teacher} hint={t.salesMoney.teacherHint}>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => onChange(e.target.value)}>
          {/* «none» only while nothing is set: leaving it never removes a teacher (no teacherId is sent). */}
          {value === '' && <option value="">{t.salesMoney.teacherNone}</option>}
          {teachers.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
