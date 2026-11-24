import type { StudentRecordingFilters } from '@ab/schedule';
import { STUDENT_RECORDING_STATUSES, type StudentRecordingStatus } from '@ab/schedule';
import { DateFilterField, SelectFilterField, chipIfSet } from '@/components/table-toolbar/fields';
import { TableToolbar } from '@/components/table-toolbar/TableToolbar';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const F = t.studentRecordings.filters;

export interface TeacherChoice {
  id: string;
  name: string;
}

export interface RecordingFiltersBarProps {
  value: StudentRecordingFilters;
  onChange: (next: StudentRecordingFilters) => void;
  teachers: TeacherChoice[];
}

const unset = (v: string | undefined) => (v === '' ? undefined : v);

const S = t.studentRecordings.status;
const STATUS_OPTIONS = [
  { value: '', label: F.statusAll },
  ...STUDENT_RECORDING_STATUSES.map((s) => ({ value: s, label: S[s] })),
];
const asStatus = (v: string | undefined): StudentRecordingStatus | undefined =>
  STUDENT_RECORDING_STATUSES.find((s) => s === v);

/** The teacher select shows only when there is a choice. */
export function RecordingFiltersBar({ value, onChange, teachers }: RecordingFiltersBarProps) {
  const set = (patch: StudentRecordingFilters) => onChange({ ...value, ...patch });
  const teacherName = teachers.find((x) => x.id === value.teacherId)?.name;
  const chips = [
    ...chipIfSet({ id: 'from', label: F.from, value: value.from, onRemove: () => set({ from: undefined }) }),
    ...chipIfSet({ id: 'to', label: F.to, value: value.to, onRemove: () => set({ to: undefined }) }),
    ...chipIfSet({ id: 'status', label: F.status, value: value.status, text: value.status && S[value.status], onRemove: () => set({ status: undefined }) }),
    ...chipIfSet({ id: 'teacher', label: F.teacher, value: value.teacherId, text: teacherName, onRemove: () => set({ teacherId: undefined }) }),
  ];
  const fields = (
    <>
      <DateFilterField label={F.from} value={value.from} onChange={(v) => set({ from: v })} />
      <DateFilterField label={F.to} value={value.to} onChange={(v) => set({ to: v })} />
      <SelectFilterField
        label={F.status}
        value={value.status}
        options={STATUS_OPTIONS}
        onChange={(v) => set({ status: asStatus(v) })}
      />
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
