import type { LessonView } from '@ab/shared';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { LESSONS_KEY } from '@/features/teaching/schedule';

// docs/48: her own lesson lists (the home window and «جدولي»'s weeks) share ['lessons','mine',…].
// Only that prefix is patched: other keys under ['lessons'] are not her lists.

const MY_LESSONS: QueryKey = [...LESSONS_KEY, 'mine'];

/** What a patch replaced, to put back when the server refuses. */
export type LessonsSnapshot = readonly (readonly [QueryKey, LessonView[] | undefined])[];

const patchList = (id: string, patch: Partial<LessonView>) => (list: LessonView[] | undefined) =>
  list?.map((l) => (l.id === id ? { ...l, ...patch } : l));

/** Stops in-flight reads of her lists (so none lands over the patch). */
export const holdMyLessons = (client: QueryClient) =>
  client.cancelQueries({ queryKey: MY_LESSONS });

/** Puts `patch` on lesson `id` in every cached list of hers; returns what was there before. */
export function patchMyLesson(
  client: QueryClient,
  o: { id: string; patch: Partial<LessonView> },
): LessonsSnapshot {
  const before = client.getQueriesData<LessonView[]>({ queryKey: MY_LESSONS });
  client.setQueriesData<LessonView[]>({ queryKey: MY_LESSONS }, patchList(o.id, o.patch));
  return before;
}

/** Puts the snapshot back (a refused «سأحضر»). */
export function restoreMyLessons(client: QueryClient, snapshot: LessonsSnapshot | undefined) {
  for (const [key, data] of snapshot ?? []) client.setQueryData(key, data);
}
