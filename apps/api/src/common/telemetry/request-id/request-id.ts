import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export const REQUEST_ID_HEADER = 'x-request-id';

/** A caller's id is kept only when it is short and plain (no spaces or line breaks in our logs). */
const incomingId = z.string().regex(/^[A-Za-z0-9._:-]{1,128}$/);

/** The incoming X-Request-Id when it is sane (a proxy's or an app's), else a new UUID. */
export function pickRequestId(header: unknown): string {
  const parsed = incomingId.safeParse(header);
  return parsed.success ? parsed.data : randomUUID();
}

const store = new AsyncLocalStorage<string>();

/** Runs `fn` (and everything it awaits) as part of the request `id`. */
export function withRequestId<T>(id: string, fn: () => T): T {
  return store.run(id, fn);
}

/** The id of the request this code runs for; undefined in a job or at boot. */
export const currentRequestId = (): string | undefined => store.getStore();
