// Placeholders of a saved reply «الردود السريعة» (owner 2026-10-25), filled on the client when the reply
// goes into the composer (still editable before sending). A placeholder with no value is removed with
// the space or bracket around it, so «أهلًا {name}، كيف حالك؟» with no name reads «أهلًا، كيف حالك؟».

/** {name} the contact (guardian / lead), {student} the first student, {assistant} the sender. */
export const SAVED_REPLY_PLACEHOLDERS = ['name', 'student', 'assistant'] as const;
export type SavedReplyPlaceholder = (typeof SAVED_REPLY_PLACEHOLDERS)[number];
export type SavedReplyValues = Partial<Record<SavedReplyPlaceholder, string | null>>;

/** How a placeholder is written in a reply: «{name}». */
export const placeholderToken = (key: SavedReplyPlaceholder): string => `{${key}}`;

/** Marks a removed placeholder while the text around it is tidied; never typed by a person. */
const GAP = '\u0000';
const TOKEN = /\{(name|student|assistant)\}/g;
const PUNCT = '،,.!?؟؛;:';

const isPlaceholder = (key: string): key is SavedReplyPlaceholder => SAVED_REPLY_PLACEHOLDERS.some((p) => p === key);

/** Removed placeholders and what they leave behind, in order; text away from a gap is never touched. */
const TIDY: readonly [RegExp, string][] = [
  [new RegExp(`${GAP}([ \\t]*${GAP})+`, 'g'), GAP], // two removed side by side are one gap
  [new RegExp(`[(\\[«][ \\t]*${GAP}[ \\t]*[)\\]»]`, 'g'), GAP], // «({student})» empty brackets
  [new RegExp(`(^|[ \\t\\n])يا[ \\t]+${GAP}`, 'gm'), `$1${GAP}`], // «يا {name}»: no vocative left alone
  [new RegExp(`^[ \\t]*${GAP}[ \\t]*[،,؛;:]?[ \\t]*`, 'gm'), ''], // at a line's start, with its comma
  [new RegExp(`[ \\t]*${GAP}[ \\t]*(?=[${PUNCT})\\]»])`, 'g'), ''], // before punctuation
  [new RegExp(`[ \\t]*${GAP}[ \\t]*$`, 'gm'), ''], // at a line's end
  [new RegExp(`[ \\t]*${GAP}[ \\t]*`, 'g'), ' '], // between two words: one space
];

/**
 * The reply's text with {name}, {student} and {assistant} filled from `values` (trimmed); an empty or
 * missing value removes its placeholder cleanly. Other braces («{x}») stay as written. Pure.
 */
export function resolveSavedReply(body: string, values: SavedReplyValues): string {
  const filled = body.replace(TOKEN, (_all, key: string) => {
    const value = isPlaceholder(key) ? values[key]?.trim() : '';
    return value ? value.split(GAP).join('') : GAP;
  });
  if (!filled.includes(GAP)) return filled;
  return TIDY.reduce((text, [re, by]) => text.replace(re, by), filled).trim();
}

/** The placeholders a reply uses (the editor's hint), in SAVED_REPLY_PLACEHOLDERS order. */
export function placeholdersIn(body: string): SavedReplyPlaceholder[] {
  return SAVED_REPLY_PLACEHOLDERS.filter((key) => body.includes(placeholderToken(key)));
}
