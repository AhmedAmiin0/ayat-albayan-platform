import { z } from 'zod';

export const routeMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export type RouteMethod = z.infer<typeof routeMethodSchema>;

/** An answer without a JSON body: 204, a stream or download, or a redirect. */
export const routeAnswerSchema = z.enum(['empty', 'file', 'redirect']);
export type RouteAnswer = z.infer<typeof routeAnswerSchema>;

/** A route object's `isPublic`: only ever `true`, or left out. */
export const routePublicSchema = z.object({ isPublic: z.literal(true).optional() });
