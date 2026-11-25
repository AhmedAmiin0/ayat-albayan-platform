import type { z } from 'zod';
import { ApiError } from '../api-error';

/** The server answered 2xx; only the body broke the contract. */
const ANSWERED = 200;

const withoutQuery = (path: string): string => path.split('?', 1)[0] ?? path;

/**
 * The answer parsed with the route's shared schema (docs/36 z14). A mismatch throws ApiError
 * `bad_response` naming the failing paths, never the values (they may hold personal data).
 */
export function parseResponse<S extends z.ZodType>(
  schema: S,
  body: unknown,
  path: string,
): z.output<S> {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const issues = result.error.issues.map((issue) => issue.path.join('.'));
  throw new ApiError(ANSWERED, { code: 'bad_response', path: withoutQuery(path), issues });
}
