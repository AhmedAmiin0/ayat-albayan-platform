import type { PortalHome } from '@ab/shared';

/** What a list of the login's students shows: placeholders, the error, the empty note, the list. */
export type HomeState = 'loading' | 'error' | 'empty' | 'list';

interface HomeRead {
  data: PortalHome | undefined;
  isError: boolean;
}

/** Cached data wins over a failed refetch (offline keeps the cards, R-MOB-03). */
export function homeState({ data, isError }: HomeRead): HomeState {
  if (data) return data.students.length > 0 ? 'list' : 'empty';
  return isError ? 'error' : 'loading';
}
