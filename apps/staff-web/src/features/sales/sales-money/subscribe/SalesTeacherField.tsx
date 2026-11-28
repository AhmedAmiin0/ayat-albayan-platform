import { teacherChoice, type TeacherPick } from '@ab/client-core';
import type { SalesFamilyStudent, SalesTeacherOption } from '@ab/shared';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Field, Select, apiFetch, t } from '@ab/web-kit';
import { salesSubscriptionKeys } from '@/features/sales/keys';

export const salesTeachersQuery = queryOptions({
  queryKey: salesSubscriptionKeys.teachers(),
  queryFn: () => apiFetch<SalesTeacherOption[]>('/sales/subscriptions/teachers'),
  staleTime: 5 * 60_000,
});

/** teacherChoice (@ab/client-core) with her pick kept: the teacher to show and the body to send. */
export function useTeacherPick(students: readonly SalesFamilyStudent[], studentId: string) {
  const [pick, setPick] = useState<TeacherPick | null>(null);
  const options = useQuery(salesTeachersQuery).data;
  return {
    ...teacherChoice(students, { studentId, pick, options }),
    setTeacher: (teacherId: string) => setPick({ studentId, teacherId }),
  };
}

interface Props {
  value: string;
  onChange: (id: string) => void;
}

/** Defaults to the trial's teacher (students.teacher_id); teacher chat opens after subscribing. */
export function SalesTeacherField({ value, onChange }: Props) {
  const teachers = useQuery(salesTeachersQuery).data ?? [];
  return (
    <Field label={t.salesMoney.teacher} hint={t.salesMoney.teacherHint}>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => onChange(e.target.value)}>
          {/* «none» only while unset: leaving it never removes a teacher (no teacherId sent). */}
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
