import { z } from 'zod';

/** Which public route: GET /join/:token or GET /report-link/legacy/*. */
export const linkRouteSchema = z.enum(['join', 'legacy']);
export type LinkRoute = z.infer<typeof linkRouteSchema>;
