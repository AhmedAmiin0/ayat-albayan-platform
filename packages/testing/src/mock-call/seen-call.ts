import { z } from 'zod';
import type { CallKind, SeenCall } from './mock-call.types';

const PARAM = /:([A-Za-z_]\w*)/g;
const queryValue = z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()]);
const routeForm = z.object({
  route: z.object({ method: z.string(), path: z.string() }),
  params: z.record(z.string(), z.unknown()).default({}),
  query: z.record(z.string(), queryValue).default({}),
  body: z.unknown().optional(),
});
const pathForm = z.object({
  method: z.string().default('GET'),
  path: z.string(),
  body: z.unknown().optional(),
});

const filled = (value: unknown): boolean => value !== undefined && value !== null && value !== '';

function searchOf(query: Record<string, z.infer<typeof queryValue>>): string {
  const pairs = Object.entries(query).filter(([, value]) => filled(value));
  const text = pairs.map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
  return text.length === 0 ? '' : `?${text.join('&')}`;
}

const fromRoute = routeForm.transform(({ route, params, query, body }) => {
  const fill = (_: string, name: string): string => encodeURIComponent(String(params[name]));
  return {
    method: route.method,
    path: `${route.path.replace(PARAM, fill)}${searchOf(query)}`,
    body,
  };
});

/** A route-form or path-form request as the test sees it; anything else throws. */
export const seenCall = z.union([fromRoute, pathForm]);

export const kindOf = (seen: Pick<SeenCall, 'method'>): CallKind =>
  seen.method === 'GET' ? 'read' : 'write';

export const pathWithoutQuery = (path: string): string => path.split('?', 1)[0] ?? path;
