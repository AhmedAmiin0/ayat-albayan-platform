import { useQuery } from '@tanstack/react-query';
import { portalHomeQuery } from '@ab/web-kit/portal';

/** GET /portal/me: who signed in (guardian or student) and their students. */
export const usePortalHome = () => useQuery(portalHomeQuery);
