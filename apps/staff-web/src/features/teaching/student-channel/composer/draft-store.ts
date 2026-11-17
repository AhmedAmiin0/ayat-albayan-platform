// The composer's unsent text per chat: kept for the browser tab's session (sessionStorage), so
// closing the assistant's panel or leaving the page and coming back finds it again. Storage can
// be missing or throw (private window, blocked site data): the memory copy carries on then.

const memory = new Map<string, string>();
const PREFIX = 'ab.channel-draft:';

/** One chat's draft key (the audience and the student: each seat keeps its own text). */
export const draftKey = (ref: { audience: string; studentId: string }): string =>
  `${ref.audience}:${ref.studentId}`;

export function readDraft(key: string): string {
  try {
    return sessionStorage.getItem(PREFIX + key) ?? memory.get(key) ?? '';
  } catch {
    return memory.get(key) ?? '';
  }
}

/** Stores the text; an empty one removes the draft. */
export function writeDraft(key: string, text: string): void {
  memory.set(key, text);
  try {
    if (text) sessionStorage.setItem(PREFIX + key, text);
    else sessionStorage.removeItem(PREFIX + key);
  } catch {
    // The memory copy is enough for this tab.
  }
}
