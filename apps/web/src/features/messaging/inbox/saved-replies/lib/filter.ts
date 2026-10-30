import { normalizeArabic, type SavedReply, type SavedReplyScope } from '@ab/shared';

// The picker's pure parts: which list, the search, and the «/» trigger of the composer.

/** One tab's replies whose title or text holds `query` (case, tashkeel and letter forms ignored), in served order. */
export function filterReplies(replies: readonly SavedReply[], input: { scope: SavedReplyScope; query: string }): SavedReply[] {
  const q = normalizeArabic(input.query);
  return replies.filter((r) => r.scope === input.scope && (!q || normalizeArabic(`${r.title} ${r.body}`).includes(q)));
}

/** The «/» list (owner 2026-10-26, as WhatsApp): both tabs in one list, the served order kept. */
export function matchReplies(replies: readonly SavedReply[], query: string): SavedReply[] {
  return [...filterReplies(replies, { scope: 'shared', query }), ...filterReplies(replies, { scope: 'mine', query })];
}

/**
 * The search typed after a «/» that starts the box or a new line and runs to the end of the text
 * («/سع» → «سع»); null when there is none (a «/» inside a sentence is just a slash).
 */
export function slashQuery(text: string): string | null {
  const match = /(?:^|\n)\/([^\n/]*)$/.exec(text);
  return match ? (match[1] ?? '') : null;
}

/** Where the «/query» token starts, so a dismissed trigger is not reopened by more typing. */
export function slashStart(text: string): number {
  return text.length - (slashQuery(text) ?? '').length - 1;
}

/** The box after picking: the «/query» token replaced by the reply, else the reply after what was typed. */
export function fillComposer(text: string, reply: string): string {
  const query = slashQuery(text);
  if (query !== null) return text.slice(0, slashStart(text)) + reply;
  if (!text.trim()) return reply;
  return `${text.replace(/\s+$/, '')}\n${reply}`;
}
