import type { PortalMe } from './portal-me';

/** What home shows: placeholders, the error, the empty note, or the children's cards. */
export type HomeState = 'loading' | 'error' | 'empty' | 'list';

interface HomeRead {
  data: PortalMe | undefined;
  isError: boolean;
}

/** Cached data wins over a failed refetch (offline keeps the cards, R-MOB-03). */
export function homeState({ data, isError }: HomeRead): HomeState {
  if (data) return data.students.length > 0 ? 'list' : 'empty';
  return isError ? 'error' : 'loading';
}
