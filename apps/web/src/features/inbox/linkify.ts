// Clickable links in a chat message (W11). Only http(s) URLs: `javascript:`, `www.` without a
// scheme and other schemes stay text. Signed links never reach sales (the API strips them).

export interface TextPart {
  text: string;
  /** Set on a link part: the URL it opens. */
  href?: string;
}

const URL_RE = /https?:\/\/[^\s]+/g;
/** Sentence punctuation that ends a URL written inside a sentence: «… https://a.b/c.» */
const TRAILING_RE = /[.,،؛)]+$/;

/** The text cut into plain and link parts, in order; joined back, the parts are the text. */
export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const href = match[0].replace(TRAILING_RE, '');
    const start = match.index;
    if (start > last) parts.push({ text: text.slice(last, start) });
    // «http://.» trims to the bare scheme: text, not a link.
    parts.push(/:\/\/./.test(href) ? { text: href, href } : { text: href });
    last = start + href.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
