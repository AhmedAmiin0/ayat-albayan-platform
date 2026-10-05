import { DateFilterField, SelectFilterField, chipIfSet } from '@/components/table-toolbar/fields';
import { TableToolbar } from '@/components/table-toolbar/TableToolbar';
import { t } from '@/lib/i18n';
import type { RecordingFilters } from './recordings-api';

const F = t.studentRecordings.filters;

export interface TeacherChoice {
  id: string;
  name: string;
}

export interface RecordingFiltersBarProps {
  value: RecordingFilters;
  onChange: (next: RecordingFilters) => void;
  teachers: TeacherChoice[];
}

const unset = (v: string | undefined) => (v === '' ? undefined : v);

/**
 * The shared table toolbar over the list: «من تاريخ» / «إلى تاريخ» and the teacher in the «تصفية»
 * panel, the set ones as removable chips. The teacher select shows only when there is a choice.
 */
export function RecordingFiltersBar({ value, onChange, teachers }: RecordingFiltersBarProps) {
  const set = (patch: RecordingFilters) => onChange({ ...value, ...patch });
  const teacherName = teachers.find((x) => x.id === value.teacherId)?.name;
  const chips = [
    ...chipIfSet({ id: 'from', label: F.from, value: value.from, onRemove: () => set({ from: undefined }) }),
    ...chipIfSet({ id: 'to', label: F.to, value: value.to, onRemove: () => set({ to: undefined }) }),
    ...chipIfSet({ id: 'teacher', label: F.teacher, value: value.teacherId, text: teacherName, onRemove: () => set({ teacherId: undefined }) }),
  ];
  const fields = (
    <>
      <DateFilterField label={F.from} value={value.from} onChange={(v) => set({ from: v })} />
      <DateFilterField label={F.to} value={value.to} onChange={(v) => set({ to: v })} />
      {teachers.length > 1 && (
        <SelectFilterField
          label={F.teacher}
          value={value.teacherId}
          options={[{ value: '', label: F.teacherAll }, ...teachers.map((x) => ({ value: x.id, label: x.name }))]}
          onChange={(v) => set({ teacherId: unset(v) })}
        />
      )}
    </>
  );
  return <TableToolbar fields={fields} chips={chips} onClearAll={() => onChange({})} />;
}
