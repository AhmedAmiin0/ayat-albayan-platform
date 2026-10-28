// The initials circle (owner 2026-10-28), the same on web and mobile: an Arabic name gives ONE letter,
// its first word's first (a leading «ال» dropped: «الحسن علي» → «ح»; hamza forms as typed: «أحمد» → «أ»);
// a Latin name up to two, upper-cased («sara ahmed» → «SA»). Words without a letter (an emoji, a «+966…»)
// are skipped; no letter at all → '' (the circle shows the person glyph).

const LETTER = /\p{L}/u;
const ARABIC = /\p{Script=Arabic}/u;

/** The word from its first letter on ('' when it has none): «(سارة)» → «سارة)». */
function fromFirstLetter(word: string): string {
  const chars = Array.from(word);
  const at = chars.findIndex((c) => LETTER.test(c));
  return at < 0 ? '' : chars.slice(at).join('');
}

/** «ال» at a word start, when a name is left after it («ال» alone stays). */
function withoutArticle(word: string): string {
  return word.startsWith('ال') && Array.from(word).length > 3 ? word.slice(2) : word;
}

const firstLetter = (word: string): string => Array.from(word).find((c) => LETTER.test(c)) ?? '';

export function avatarInitials(name: string): string {
  const words = name.trim().split(/\s+/).map(fromFirstLetter).filter((w) => w !== '');
  const [first, second] = words;
  if (first === undefined) return '';
  if (ARABIC.test(firstLetter(first))) return firstLetter(withoutArticle(first));
  return [first, second].map((w) => (w === undefined ? '' : firstLetter(w).toLocaleUpperCase('en'))).join('');
}
