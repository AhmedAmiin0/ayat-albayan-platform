import { teacherChoice, type TeacherPick } from '@ab/client-core';
import type { SalesFamilyStudent } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t, FilterPills, Section } from '@ab/mobile-kit';
import { Note } from '@/more';
import { SearchField } from '@/core/ui/form/SearchField';
import { useSalesTeachers } from '@/sales-subscribe/hooks/use-sales-teachers';

/** Her pick kept per student; teacherChoice (@ab/client-core) gives the pill to mark and the body to send. */
export function useTeacherPick(students: readonly SalesFamilyStudent[], studentId: string) {
  const [pick, setPick] = useState<TeacherPick | null>(null);
  const options = useSalesTeachers().data;
  const setTeacher = (teacherId: string) => setPick({ studentId, teacherId });
  return { setTeacher, ...teacherChoice(students, { studentId, pick, options }) };
}

interface SalesTeacherPillsProps {
  /** No child picked yet: nothing to assign. */
  hidden: boolean;
  /** '' = no teacher (the chat stays closed). */
  value: string;
  onChange: (id: string) => void;
}

/** More teachers than this: a search narrows the pills (the picked one always stays). */
const SEARCH_FROM = 8;

/** Defaults to the trial's teacher (students.teacher_id); their chat opens after subscribing. */
export function SalesTeacherPills({ hidden, value, onChange }: SalesTeacherPillsProps) {
  const teachers = useSalesTeachers().data ?? [];
  const [q, setQ] = useState('');
  if (hidden) return null;
  const shown = teachers.filter((x) => x.id === value || x.name.includes(q.trim()));
  // «none» only while nothing is set: leaving it never removes a teacher (no teacherId is sent).
  const none = value === '' ? [{ value: '', label: t.salesMoney.teacherNone }] : [];
  const items = [...none, ...shown.map((x) => ({ value: x.id, label: x.name }))];
  return (
    <Section title={t.salesMoney.teacher}>
      <View style={{ gap: 8 }}>
        {teachers.length > SEARCH_FROM ? <SearchField compact onSearch={setQ} label={t.salesMoney.teacherSearch} /> : null}
        <FilterPills wrap role="radiogroup" accessibilityLabel={t.salesMoney.teacher} items={items} value={value} onChange={onChange} />
        <Note>{t.salesMoney.teacherHint}</Note>
      </View>
    </Section>
  );
}
