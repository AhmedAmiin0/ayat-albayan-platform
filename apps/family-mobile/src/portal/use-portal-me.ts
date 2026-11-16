import { portalViewer, readsOwn } from '@ab/client-core';
import type { PortalHome, PortalKind, PortalStudent } from '@ab/shared';
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

/**
 * The page of the student in view reads in its own words («أهلًا بك», «حضرتها», «تقاريري»): a
 * student's own login and an adult who is their own contact (@ab/client-core readsOwn), never a
 * guardian's child. While /portal/me or the pick loads, a guardian's words only for a guardian.
 */
export function ownPage(kind: PortalKind | undefined, student: PortalStudent | null): boolean {
  if (kind === undefined || student === null) return kind !== 'guardian';
  return readsOwn(portalViewer(kind, student));
}
