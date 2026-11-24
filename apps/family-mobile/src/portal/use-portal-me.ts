import { portalViewer, readsOwn } from '@ab/client-core';
import type { PortalHome, PortalKind, PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useScreenFocused } from '@ab/mobile-kit';
import { portal } from './api';

/** A student's own student, or null for a guardian (@ab/client-core, shared with the web). */
export { ownStudent } from '@ab/client-core';

/** GET /portal/me: who signed in and their students; re-read when the screen comes back. */
export function usePortalMe() {
  return useQuery({ ...portal.portalHomeQuery, subscribed: useScreenFocused() });
}

/** One of the login's students by id (a route param), or null. */
export const studentOf = (me: PortalHome | undefined, id: string): PortalStudent | null =>
  me?.students.find((s) => s.id === id) ?? null;

/** Own-voice wording for a student or self-contact adult, never for a guardian's child. */
export function ownPage(kind: PortalKind | undefined, student: PortalStudent | null): boolean {
  if (kind === undefined || student === null) return kind !== 'guardian';
  return readsOwn(portalViewer(kind, student));
}
