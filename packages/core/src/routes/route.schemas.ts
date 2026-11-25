import { z } from 'zod';

export const routeMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export type RouteMethod = z.infer<typeof routeMethodSchema>;

/** An answer without a JSON body: 204, a stream or download, or a redirect. */
export const routeAnswerSchema = z.enum(['empty', 'file', 'redirect']);
export type RouteAnswer = z.infer<typeof routeAnswerSchema>;
