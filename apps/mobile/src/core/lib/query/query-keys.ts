// Query keys are the API path's segments, so invalidating ['students'] reaches every list and
// detail under /students. Paged lists add 'list' + their filter params:
//   GET /students/:id          → ['students', id]
//   GET /leads?status=new&q=…  → ['leads', 'list', { status: 'new', q: '…' }]
//   GET /auth/me               → ['auth', 'me']

export type ListParams = Record<string, string | number | undefined>;

export function pathKey(path: string): string[] {
  return path.split('/').filter(Boolean);
}

export function listKey(path: string, params: ListParams = {}): unknown[] {
  return [...pathKey(path), 'list', params];
}
