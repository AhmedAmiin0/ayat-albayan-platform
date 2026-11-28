import { lessonListCalls } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

const lists = lessonListCalls({ apiFetch, apiSend });

/**
 * GET /lessons/overview?from&to (admin, ≤ 31 days): one Riyadh week of every teacher and lesson.
 * Key ['lessons', 'overview', { from, to }]: a lesson's confirm / cancel / reschedule patches and
 * refetches it with everything under ['lessons'], and the persisted cache keeps the last week for
 * an offline start (R-MOB-03). Moving between the week's days reads the same entry.
 */
export function useOverview(window: { from: string; to: string }) {
  return useQuery({
    queryKey: [...pathKey('/lessons/overview'), window],
    queryFn: () => lists.overview(window),
  });
}
