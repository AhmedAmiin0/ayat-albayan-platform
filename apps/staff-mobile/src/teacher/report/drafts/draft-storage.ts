import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from '@ab/client-core';
import { z } from 'zod';

// Unsent drafts (R-REP-02) stay on the phone until saved; a copy older than the server's drops.

export const REPORT_DRAFTS_KEY = 'ab.report-drafts';

const storedSchema = z.object({ body: z.string(), base: z.string() });
type Stored = z.infer<typeof storedSchema>;
const isStored = (entry: [string, unknown]): entry is [string, Stored] =>
  storedSchema.safeParse(entry[1]).success;

// One bad entry is dropped alone: the other reports' unsent bodies stay.
const draftsSchema = z
  .record(z.string(), z.unknown())
  .transform((all): Drafts => Object.fromEntries(Object.entries(all).filter(isStored)));

type Drafts = Record<string, Stored>;

const decodeJson: (text: string) => unknown = JSON.parse;

/** Stored text through its schema; missing, broken or old text is null. */
export function parseStored<T>(schema: z.ZodType<T>, raw: string | null): T | null {
  try {
    const parsed = schema.safeParse(decodeJson(raw ?? 'null'));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// null = storage could not be read: a write must then skip, never replace the record with {}.
async function readAll(): Promise<Drafts | null> {
  try {
    return parseStored(draftsSchema, await AsyncStorage.getItem(REPORT_DRAFTS_KEY)) ?? {};
  } catch {
    return null;
  }
}

let queue: Promise<void> = Promise.resolve();

/** Read-modify-write in call order, so a drop never lands before the keep it follows. */
function update(change: (drafts: Drafts) => Drafts): Promise<void> {
  queue = queue.then(async () => {
    try {
      const drafts = await readAll();
      if (drafts === null) return;
      await AsyncStorage.setItem(REPORT_DRAFTS_KEY, JSON.stringify(change(drafts)));
    } catch {
      return;
    }
  });
  return queue;
}

export async function readStoredDraft(id: string): Promise<Stored | null> {
  await queue;
  return (await readAll())?.[id] ?? null;
}

export const keepStoredDraft = (id: string, kept: Stored): Promise<void> =>
  update((drafts) => ({ ...drafts, [id]: kept }));

export const dropStoredDraft = (id: string): Promise<void> =>
  update(({ [id]: _dropped, ...rest }) => rest);

const isRefusal = (error: unknown): boolean => error instanceof ApiError && error.status < 500;

/** A 4xx (edit window closed, report sent elsewhere) never succeeds on a retry: forget the copy. */
export const dropIfRefused = (id: string, error: unknown): Promise<void> =>
  isRefusal(error) ? dropStoredDraft(id) : Promise.resolve();
