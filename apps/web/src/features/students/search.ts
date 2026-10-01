/** URL search of /admin/students; defaults (no search, page 1) are left out of the URL. */
export type StudentsUrlSearch = { search?: string; page?: number };

export function parseStudentsSearch(s: Record<string, unknown>): StudentsUrlSearch {
  return {
    search: typeof s['search'] === 'string' && s['search'] ? s['search'] : undefined,
    page: Number(s['page']) > 1 ? Math.floor(Number(s['page'])) : undefined,
  };
}
