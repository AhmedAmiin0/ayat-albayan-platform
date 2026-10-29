import { teacherChoice, type TeacherPick } from '@ab/client-core';
import type { SalesFamilyStudent } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note, Section } from '@/more';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { useSalesTeachers } from '../hooks/use-sales-teachers';

/** Her pick kept per student; teacherChoice (@ab/client-core) gives the pill to mark and the body to send. */
export function useTeacherPick(students: readonly SalesFamilyStudent[], studentId: string) {
  const [pick, setPick] = useState<TeacherPick | null>(null);
  const setTeacher = (teacherId: string) => setPick({ studentId, teacherId });
  return { setTeacher, ...teacherChoice(students, { studentId, pick }) };
}

interface SalesTeacherPillsProps {
  /** No child picked yet: nothing to assign. */
  hidden: boolean;
  /** '' = no teacher (the chat stays closed). */
  value: string;
  onChange: (id: string) => void;
}

/**
 * «المعلم/ة» (owner 2026-10-29): who teaches the student once subscribed, the trial's teacher by default
 * (students.teacher_id). Saved with the package; the teacher–student chat opens after the subscription.
 */
export function SalesTeacherPills({ hidden, value, onChange }: SalesTeacherPillsProps) {
  const teachers = useSalesTeachers().data ?? [];
  if (hidden) return null;
  const items = [{ value: '', label: t.salesMoney.teacherNone }, ...teachers.map((x) => ({ value: x.id, label: x.name }))];
  return (
    <Section title={t.salesMoney.teacher}>
      <View style={{ gap: 8 }}>
        <FilterPills wrap role="radiogroup" accessibilityLabel={t.salesMoney.teacher} items={items} value={value} onChange={onChange} />
        <Note>{t.salesMoney.teacherHint}</Note>
      </View>
    </Section>
  );
}
