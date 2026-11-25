import { useQuery } from '@tanstack/react-query';
import { portalHomeQuery } from '@ab/web-kit';

/** GET /portal/me: who signed in (guardian or student) and their students. */
export const usePortalHome = () => useQuery(portalHomeQuery);
