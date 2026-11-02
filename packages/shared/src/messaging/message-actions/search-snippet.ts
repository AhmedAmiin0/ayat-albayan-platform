import { highlightParts } from '../replies/saved-reply-text.js';
import { SNIPPET_SIDE } from './chat-search.js';

const ELLIPSIS = '…';

/** Where the first match starts and ends in the original text; null without one. */
function firstMatch(text: string, query: string): { start: number; end: number } | null {
  const parts = highlightParts(text, query);
  const at = parts.findIndex((p) => p.match);
  const hit = parts[at];
  if (!hit) return null;
  const start = parts.slice(0, at).reduce((n, p) => n + p.text.length, 0);
  return { start, end: start + hit.text.length };
}

/**
 * A one-line excerpt around the first match (SNIPPET_SIDE characters each side, «…» where cut),
 * the original characters kept; the text's start when nothing matches (a document name hit).
 */
export function searchSnippet(text: string, query: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const hit = firstMatch(flat, query) ?? { start: 0, end: 0 };
  const from = Math.max(0, hit.start - SNIPPET_SIDE);
  const to = Math.min(flat.length, hit.end + SNIPPET_SIDE);
  const head = from > 0 ? ELLIPSIS : '';
  const tail = to < flat.length ? ELLIPSIS : '';
  return `${head}${flat.slice(from, to)}${tail}`;
}
