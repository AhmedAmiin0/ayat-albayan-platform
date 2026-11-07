import {
  threadSyncSchema,
  type SyncMessage,
  type ThreadSync,
  type ThreadView,
} from '@ab/shared';
import { z } from 'zod';

// GET /threads/sync on the phone (docs/43 43-6): the envelope is parsed with the shared zod
// schema (rule 12). Its rows are loose objects that keep the server's whole view: the one
// place they take the view types is here, after the schema checked the keys the store needs.

const messageRow = threadSyncSchema.shape.messages.element;
const threadRow = threadSyncSchema.shape.threads.element;

/** A synced row: id, phone, created_at and updated_at checked; every other field kept. */
export const syncMessageSchema = messageRow.transform((m) => m as unknown as SyncMessage);
/** A chats-list row: phone and last_message_id checked; every other field kept. */
export const syncThreadSchema = threadRow.transform((t) => t as unknown as ThreadView);

/** The answer of GET /threads/sync, parsed (a malformed answer throws: the engine retries). */
export function parseThreadSync(raw: unknown): ThreadSync {
  const env = threadSyncSchema.parse(raw);
  return {
    ...env,
    messages: env.messages.map((m) => syncMessageSchema.parse(m)),
    threads: env.threads.map((t) => syncThreadSchema.parse(t)),
  };
}

const decodeJson: (text: string) => unknown = JSON.parse;

type JsonText<T extends z.ZodType> = z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform>, T>;

/** A JSON text column read back through `schema` (the store's rows are boundary data too). */
export const jsonText = <T extends z.ZodType>(schema: T): JsonText<T> =>
  z.string().transform(decodeJson).pipe(schema);
