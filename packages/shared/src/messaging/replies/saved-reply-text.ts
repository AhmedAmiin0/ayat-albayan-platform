import { normalizeArabic } from '../../format/arabic.js';

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

// Quick replies (owner 2026-10-26, as WhatsApp): which letters of a reply match what was typed
// after «/», for the web and mobile lists to draw in bold.

/** A run of a reply's text, `match` when it is part of what was typed after «/». */
export interface MatchPart {
  text: string;
  match: boolean;
}

/** One character as the search sees it: tashkeel gone, letter forms unified, spaces as one. */
function fold(c: string, prev: string): string {
  if (/\s/.test(c)) return prev === '' || prev.endsWith(' ') ? '' : ' ';
  return normalizeArabic(c);
}

/** The text as the search sees it, and for each of its characters the original index. */
function folded(text: string): { folded: string; from: number[] } {
  let out = '';
  const from: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    for (const c of fold(text.charAt(i), out)) {
      out += c;
      from.push(i);
    }
  }
  return { folded: out, from };
}

/** Which original characters fall inside a match (the tashkeel between matched letters too). */
function hits(text: string, q: string): boolean[] {
  const { folded: f, from } = folded(text);
  const hit = new Array<boolean>(text.length).fill(false);
  for (let at = f.indexOf(q); at !== -1; at = f.indexOf(q, at + q.length)) {
    const [start, end] = [from[at] ?? 0, from[at + q.length - 1] ?? 0];
    for (let i = start; i <= end; i += 1) hit[i] = true;
  }
  return hit;
}

/**
 * The text cut into matched / plain runs (WhatsApp bolds what you typed). Matched with the same
 * folding as the search (the apps' filterReplies), then mapped back to the original characters, so a match
 * in «أهلًا» for «اهلا» keeps its hamza and tanween on screen.
 */
export function highlightParts(text: string, query: string): MatchPart[] {
  const q = normalizeArabic(query);
  if (!q) return [{ text, match: false }];
  const hit = hits(text, q);
  const parts: MatchPart[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const last = parts[parts.length - 1];
    if (last && last.match === hit[i]) last.text += text.charAt(i);
    else parts.push({ text: text.charAt(i), match: hit[i] === true });
  }
  return parts;
}
