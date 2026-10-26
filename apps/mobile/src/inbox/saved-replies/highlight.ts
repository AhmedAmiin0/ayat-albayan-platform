import { normalizeArabic } from '@ab/shared';

/** A run of a reply's text, `match` when it is part of what was typed after «/». */
export interface Part {
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
 * folding as the search (filterReplies), then mapped back to the original characters, so a match
 * in «أهلًا» for «اهلا» keeps its hamza and tanween on screen.
 */
export function highlightParts(text: string, query: string): Part[] {
  const q = normalizeArabic(query);
  if (!q) return [{ text, match: false }];
  const hit = hits(text, q);
  const parts: Part[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const last = parts[parts.length - 1];
    if (last && last.match === hit[i]) last.text += text.charAt(i);
    else parts.push({ text: text.charAt(i), match: hit[i] === true });
  }
  return parts;
}
