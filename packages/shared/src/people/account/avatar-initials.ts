// Arabic name gives one letter (leading article dropped), Latin up to two; no letter gives ''.

const LETTER = /\p{L}/u;
const ARABIC = /\p{Script=Arabic}/u;

/** The word from its first letter on ('' when it has none). */
function fromFirstLetter(word: string): string {
  const chars = Array.from(word);
  const at = chars.findIndex((c) => LETTER.test(c));
  return at < 0 ? '' : chars.slice(at).join('');
}

/** Drops the leading article when a name is left after it. */
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
