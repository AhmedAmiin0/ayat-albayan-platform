import {
  STUDENT_FILTER_KEYS,
  parseStatusList,
  studentListFiltersSchema,
  type Program,
  type StudentPackageFilter,
  type StudentStatus,
  type StudentWeeklyFilter,
} from '@ab/shared';

/**
 * Filters of /admin/students as they sit in the URL (and go to GET /students as they are).
 * `status` stays a comma-joined string («trial,active»): TanStack JSON-encodes arrays in the URL.
 */
export type StudentsFilters = {
  status?: string;
  teacher?: string;
  program?: Program;
  package?: StudentPackageFilter;
  weekly?: StudentWeeklyFilter;
  tz?: string;
};
type FilterKey = keyof StudentsFilters;
const SHAPE = studentListFiltersSchema.shape;

/** Each known filter from raw search params; a blank or invalid one is dropped on its own. */
export function parseStudentFilters(s: Record<string, unknown>): StudentsFilters {
  const out: Record<string, string> = {};
  for (const key of STUDENT_FILTER_KEYS) {
    const r = SHAPE[key].safeParse(s[key]);
    const v: unknown = r.success ? r.data : undefined;
    const text = Array.isArray(v) ? v.join(',') : v;
    if (typeof text === 'string' && text) out[key] = text;
  }
  return out as StudentsFilters;
}

/** Query-string pairs for GET /students: only the filters that are set. */
export function filterParams(f: StudentsFilters): [string, string][] {
  return STUDENT_FILTER_KEYS.flatMap((k) => {
    const v = f[k];
    return v ? [[k, v] as [string, string]] : [];
  });
}

export const activeFilterCount = (f: StudentsFilters): number => filterParams(f).length;

/** Sets one filter; '' (the «الكل» option) removes it. */
export function setFilter(f: StudentsFilters, key: FilterKey, value: string): StudentsFilters {
  return parseStudentFilters({ ...f, [key]: value });
}

export const selectedStatuses = (f: StudentsFilters): StudentStatus[] => parseStatusList(f.status) ?? [];

/** Toggles one status chip in the comma-joined list. */
export function toggleStatus(f: StudentsFilters, status: StudentStatus): StudentsFilters {
  const now = selectedStatuses(f);
  const next = now.includes(status) ? now.filter((s) => s !== status) : [...now, status];
  return setFilter(f, 'status', next.join(','));
}
