import { portalViewer, readsOwn } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useScreenFocused } from '@ab/mobile-kit';
import { portal } from './api';

/** Shared with the web through @ab/client-core. */
export { ownStudent, studentOf } from '@ab/client-core';

/** GET /portal/me: who signed in and their students; re-read when the screen comes back. */
export function usePortalMe(enabled = true) {
  return useQuery({ ...portal.portalHomeQuery, enabled, subscribed: useScreenFocused() });
}

/** Own-voice wording for a student or self-contact adult, never for a guardian's child. */
export function ownPage(kind: PortalKind | undefined, student: PortalStudent | null): boolean {
  if (kind === undefined || student === null) return kind !== 'guardian';
  return readsOwn(portalViewer(kind, student));
}
