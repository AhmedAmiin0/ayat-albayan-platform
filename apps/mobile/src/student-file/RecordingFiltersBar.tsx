import { t } from '@/lib/i18n';
import { FilterPills } from '@/ui/FilterPills';
import { DATE_PRESETS, type DatePreset, type RecordingFilters } from './recording-filters';

const F = t.mobileStudentFile.recordings.filters;
const PRESET_LABEL: Record<DatePreset, string> = { all: F.dateAll, last7: F.last7, last30: F.last30, month: F.thisMonth };

export interface TeacherChoice {
  id: string;
  name: string;
}

export interface RecordingFiltersBarProps {
  value: RecordingFilters;
  onChange: (next: RecordingFilters) => void;
  /** The teachers to filter by; the row shows only when there is a real choice (more than one). */
  teachers: TeacherChoice[];
}

/** Date presets, then the teacher: single-choice pills, applied on the server (from / to / teacherId). */
export function RecordingFiltersBar({ value, onChange, teachers }: RecordingFiltersBarProps) {
  const presets = DATE_PRESETS.map((p) => ({ value: p, label: PRESET_LABEL[p] }));
  const people = [{ value: '', label: F.teacherAll }, ...teachers.map((x) => ({ value: x.id, label: x.name }))];
  return (
    <>
      <FilterPills items={presets} value={value.preset} onChange={(preset) => onChange({ ...value, preset })} accessibilityLabel={F.dateLabel} />
      {teachers.length > 1 ? (
        <FilterPills items={people} value={value.teacherId} onChange={(teacherId) => onChange({ ...value, teacherId })} accessibilityLabel={F.teacherLabel} />
      ) : null}
    </>
  );
}
