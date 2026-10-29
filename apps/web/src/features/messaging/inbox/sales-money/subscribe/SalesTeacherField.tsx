import { teacherChoice, type TeacherPick } from '@ab/client-core';
import type { SalesFamilyStudent, SalesTeacherOption } from '@ab/shared';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Field } from '@/components/ui/form/field';
import { Select } from '@/components/ui/form/select';
import { apiFetch } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

export const salesTeachersQuery = queryOptions({
  queryKey: ['sales', 'subscriptions', 'teachers'],
  queryFn: () => apiFetch<SalesTeacherOption[]>('/sales/subscriptions/teachers'),
  staleTime: 5 * 60_000,
});

/** teacherChoice (@ab/client-core) with her pick kept: the teacher to show and the body to send. */
export function useTeacherPick(students: readonly SalesFamilyStudent[], studentId: string) {
  const [pick, setPick] = useState<TeacherPick | null>(null);
  const options = useQuery(salesTeachersQuery).data;
  return { ...teacherChoice(students, { studentId, pick, options }), setTeacher: (teacherId: string) => setPick({ studentId, teacherId }) };
}

type Props = { value: string; onChange: (id: string) => void };

/**
 * «المعلم/ة» (owner 2026-10-29): who teaches the student once subscribed, the trial's teacher by default
 * (students.teacher_id). Saved with the package; the teacher–student chat opens after the subscription.
 */
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
