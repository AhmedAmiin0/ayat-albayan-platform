import { normalizeArabic, type SavedReply, type SavedReplyScope } from '@ab/shared';

// Pure helpers of the «الردود السريعة» picker (owner 2026-10-25): which replies a search shows, when
// «/» opens the picker, and how a picked reply fills the composer.

/** One tab's replies whose title or body holds the search (Arabic letter variants and case ignored), in the served order. */
export function filterReplies(list: readonly SavedReply[], input: { scope: SavedReplyScope; query: string }): SavedReply[] {
  const q = normalizeArabic(input.query);
  return list.filter((r) => r.scope === input.scope && (!q || normalizeArabic(`${r.title} ${r.body}`).includes(q)));
}

/**
 * Did this keystroke type «/» at the start of an empty box or of a new line? Its index then (the
 * «/» the pick replaces), else null. A «/» inside a word or a pasted text never opens the picker.
 */
export function slashAt(prev: string, next: string): number | null {
  if (next !== `${prev}/`) return null;
  return prev === '' || prev.endsWith('\n') ? prev.length : null;
}

/**
 * The composer's text after a pick: the «/» (and anything typed after it) replaced by the reply;
 * from the button, the reply after what is already typed, on its own line.
 */
export function filledText(input: { text: string; reply: string; slash: number | null }): string {
  const { text, reply, slash } = input;
  if (slash !== null && text[slash] === '/') return `${text.slice(0, slash)}${reply}`;
  if (!text.trim()) return reply;
  return `${text.replace(/\s+$/, '')}\n${reply}`;
}
