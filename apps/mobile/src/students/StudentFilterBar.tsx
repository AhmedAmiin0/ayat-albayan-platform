import { STUDENT_STATUSES, studentStatusStyle, type StudentStatus } from '@ab/shared';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { StudentFilterGroups } from './StudentFilterGroups';
import { activeCount, countOf, NO_FILTERS, totalOf, type StudentFilters } from './student-filters';
import { useStatusCounts, useTeacherOptions } from './use-student-list-data';

const L = t.mobileStudentFile.list;

export interface StudentFilterBarProps {
  value: StudentFilters;
  onChange: (next: StudentFilters) => void;
  /** A search is set: the counts know the filters only, so the pills show none (they would not match the list). */
  searching?: boolean;
}

/** The students list filters (web StudentFilters): status pills with the API's counts, and a «تصفية» panel. */
export function StudentFilterBar({ value, onChange, searching = false }: StudentFilterBarProps) {
  const [open, setOpen] = useState(false);
  const status = useStatusCounts(value);
  const counts = searching ? { data: undefined } : status;
  const teachers = useTeacherOptions(open);
  const n = activeCount(value);
  const total = totalOf(counts.data);
  const pills = [
    { value: '', label: L.statusAll, ...(total === undefined ? {} : { count: total }) },
    ...STUDENT_STATUSES.map((s: StudentStatus) => ({
      value: s as string,
      label: t.enums.studentStatus[s],
      ...studentStatusStyle[s],
      ...(countOf(counts.data, s) === undefined ? {} : { count: countOf(counts.data, s) }),
    })),
  ];
  return (
    <View style={{ gap: 6 }}>
      <FilterPills items={pills} value={value.status} onChange={(status) => onChange({ ...value, status })} accessibilityLabel={L.statusLabel} />
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Button
          variant="secondary"
          label={open ? L.filtersHide : n > 0 ? L.active.replace('{n}', String(n)) : L.filtersShow}
          onPress={() => setOpen((v) => !v)}
        />
        {n > 0 || value.sort !== 'newest' ? <Button variant="ghost" label={L.clear} onPress={() => onChange(NO_FILTERS)} /> : null}
      </View>
      {open ? (
        <ScrollView style={{ maxHeight: 280, flexGrow: 0 }} accessibilityLabel={L.filtersPanel}>
          <StudentFilterGroups value={value} teachers={teachers.data ?? []} onChange={onChange} />
        </ScrollView>
      ) : null}
    </View>
  );
}
