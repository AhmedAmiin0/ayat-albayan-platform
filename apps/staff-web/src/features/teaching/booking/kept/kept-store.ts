import { jsonText } from '@ab/client-core';
import { keptDraftSchema, type KeptDraft } from './kept-draft.schemas';

// An unfinished admin booking stays for the browser tab's session, so answering a chat and coming
// back finds it. Storage can be missing or throw (private window, blocked site data): the memory
// copy carries on then. Forgotten when the session ends (boot registers forgetAllKept).

const PREFIX = 'ab.booking-draft:';
const memory = new Map<string, string>();
const keptText = jsonText(keptDraftSchema);

function parsed(raw: string | null | undefined): KeptDraft | undefined {
  try {
    const read = keptText.safeParse(raw);
    return read.success ? read.data : undefined;
  } catch {
    return undefined;
  }
}

function stored(key: string): string | null | undefined {
  try {
    return sessionStorage.getItem(PREFIX + key);
  } catch {
    return memory.get(key);
  }
}

export const readKept = (key: string): KeptDraft | undefined => parsed(stored(key));

function write(key: string, raw: string | null): void {
  try {
    if (raw === null) sessionStorage.removeItem(PREFIX + key);
    else sessionStorage.setItem(PREFIX + key, raw);
  } catch {
    memory.set(key, raw ?? '');
  }
}

/** Keeps the entry's draft; null forgets it (a finished booking, or one not touched yet). */
export function saveKept(key: string, kept: KeptDraft | null): void {
  write(key, kept && JSON.stringify(kept));
}

const keptNames = (): string[] =>
  Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i) ?? '').filter(
    (name) => name.startsWith(PREFIX),
  );

/** Session end: a shared PC's next user finds no half-made booking. */
export function forgetAllKept(): void {
  memory.clear();
  try {
    for (const name of keptNames()) sessionStorage.removeItem(name);
  } catch {
    // Storage is unreachable, so it holds nothing of ours.
  }
}
