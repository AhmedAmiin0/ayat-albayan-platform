import type { PortalHome, PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useScreenFocused } from '@ab/mobile-kit';
import { portal } from './api';

/** GET /portal/me: who signed in and their students; re-read when the screen comes back. */
export function usePortalMe() {
  return useQuery({ ...portal.portalHomeQuery, subscribed: useScreenFocused() });
}

/** A student lands on their own page (docs/50 §6): their one student, or null for a guardian. */
export function ownStudent(me: PortalHome): PortalStudent | null {
  return me.kind === 'student' ? (me.students[0] ?? null) : null;
}

/** One of the login's students by id (a route param), or null. */
export const studentOf = (me: PortalHome | undefined, id: string): PortalStudent | null =>
  me?.students.find((s) => s.id === id) ?? null;
