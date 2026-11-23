import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

// Unsent «تقرير الحلقة» draft bodies by report id (R-REP-02): a failed save or a closed app keeps
// what was typed on this phone until the server has it. Storage errors are swallowed: the form
// still works, it only forgets the copy.

export const REPORT_DRAFTS_KEY = 'ab.report-drafts';

const draftsSchema = z.record(z.string(), z.string());

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

async function readAll(): Promise<Drafts> {
  try {
    return parseStored(draftsSchema, await AsyncStorage.getItem(REPORT_DRAFTS_KEY)) ?? {};
  } catch {
    return {};
  }
}

let queue: Promise<void> = Promise.resolve();

/** Read-modify-write in call order, so a drop never lands before the keep it follows. */
function update(change: (drafts: Drafts) => Drafts): Promise<void> {
  queue = queue.then(async () => {
    try {
      await AsyncStorage.setItem(REPORT_DRAFTS_KEY, JSON.stringify(change(await readAll())));
    } catch {
      return;
    }
  });
  return queue;
}

export async function readStoredDraft(id: string): Promise<string | null> {
  await queue;
  return (await readAll())[id] ?? null;
}

export const keepStoredDraft = (id: string, body: string): Promise<void> =>
  update((drafts) => ({ ...drafts, [id]: body }));

export const dropStoredDraft = (id: string): Promise<void> =>
  update(({ [id]: _dropped, ...rest }) => rest);
