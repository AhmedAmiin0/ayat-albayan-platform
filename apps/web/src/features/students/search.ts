import { parseStudentFilters, type StudentsFilters } from './filters';

/** URL search of /admin/students; defaults (no search, page 1, no filter) are left out of the URL. */
export type StudentsUrlSearch = { search?: string; page?: number } & StudentsFilters;

export function parseStudentsSearch(s: Record<string, unknown>): StudentsUrlSearch {
  return {
    search: typeof s['search'] === 'string' && s['search'] ? s['search'] : undefined,
    page: Number(s['page']) > 1 ? Math.floor(Number(s['page'])) : undefined,
    ...parseStudentFilters(s),
  };
}
