// Clickable links in a chat message (W11, web and mobile). A link is an http(s) URL, or `www.` and a
// host, which opens as `https://www.…` (owner 2026-10-26). `javascript:`, `ftp:`, other schemes and
// bare domains without `www.` stay text. Signed links never reach sales (the API strips them).

export interface TextPart {
  text: string;
  /** Set on a link part: the URL it opens. */
  href?: string;
}

const URL_RE = /https?:\/\/[^\s]+|www\.[^\s]+/g;
/** Sentence punctuation that ends a URL written inside a sentence: «… https://a.b/c.» */
const TRAILING_RE = /[.,،؛)]+$/;
/** Before `www.`, a Latin letter, digit or URL character means it is inside another word: «awww.x». */
const GLUED_RE = /[\w.@/:-]/;
/** `www.` then a host with at least one more label: «www.x.com», not «www.» or «www.x». */
const WWW_HOST_RE = /^www\.[^\s./]+\.[^\s./]/;

/** Where a matched URL opens, or null when it stays text. */
function hrefOf(url: string, before: string): string | null {
  if (url.startsWith('www.')) return !GLUED_RE.test(before) && WWW_HOST_RE.test(url) ? `https://${url}` : null;
  // «http://.» trims to the bare scheme: text, not a link.
  return /:\/\/./.test(url) ? url : null;
}

/** The text cut into plain and link parts, in order; joined back, the parts are the text. */
export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  let plain = '';
  for (const match of text.matchAll(URL_RE)) {
    const url = match[0].replace(TRAILING_RE, '');
    const start = match.index;
    const href = hrefOf(url, text.charAt(start - 1));
    plain += text.slice(last, start);
    last = start + url.length;
    if (!href) {
      plain += url;
      continue;
    }
    if (plain) parts.push({ text: plain });
    parts.push({ text: url, href });
    plain = '';
  }
  plain += text.slice(last);
  if (plain) parts.push({ text: plain });
  return parts;
}
