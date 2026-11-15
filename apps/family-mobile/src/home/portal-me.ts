import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch, pathKey } from '@ab/mobile-kit';

// GET /portal/me (docs/31, docs/50 §6) as the app's shell reads it: who signed in and their
// students. Only what home shows is parsed; the shared portal module (@ab/client-core) replaces
// this in the next PR (docs/50 §8).

const portalStudent = z.object({ id: z.string().min(1), code: z.string(), name: z.string() });
const portalMeSchema = z.object({
  kind: z.enum(['guardian', 'student']),
  students: z.array(portalStudent),
});

export type PortalChild = z.infer<typeof portalStudent>;
export type PortalMe = z.infer<typeof portalMeSchema>;

/** The signed-in family's students, newest from the API; pull to refresh refetches it. */
export function usePortalMe() {
  return useQuery({
    queryKey: pathKey('/portal/me'),
    queryFn: async () => portalMeSchema.parse(await apiFetch('/portal/me')),
  });
}

/** A student lands on their own page (docs/50 §6): their one student, or null for a guardian. */
export function ownStudent(me: PortalMe): PortalChild | null {
  return me.kind === 'student' ? (me.students[0] ?? null) : null;
}

/** The child route of one student: the seam the child screens plug into (docs/50 §8 PR 3). */
export const childHref = (id: string) => `/child/${encodeURIComponent(id)}` as const;
