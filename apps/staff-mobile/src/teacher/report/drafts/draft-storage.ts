import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

// Unsent «تقرير الحلقة» draft bodies by report id (R-REP-02): a failed save or a closed app keeps
// what was typed on this phone until the server has it. Storage errors are swallowed: the form
// still works, it only forgets the copy.

export const REPORT_DRAFTS_KEY = 'ab.report-drafts';

const bodySchema = z.string();
const isBody = (entry: [string, unknown]): entry is [string, string] =>
  bodySchema.safeParse(entry[1]).success;

// One bad entry is dropped alone: the other reports' unsent bodies stay.
const draftsSchema = z
  .record(z.string(), z.unknown())
  .transform((all): Drafts => Object.fromEntries(Object.entries(all).filter(isBody)));

type Drafts = Record<string, string>;

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

export async function readStoredDraft(id: string): Promise<string | null> {
  await queue;
  return (await readAll())?.[id] ?? null;
}

export const keepStoredDraft = (id: string, body: string): Promise<void> =>
  update((drafts) => ({ ...drafts, [id]: body }));

export const dropStoredDraft = (id: string): Promise<void> =>
  update(({ [id]: _dropped, ...rest }) => rest);
