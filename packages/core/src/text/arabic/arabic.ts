// Arabic text normalisation for search and duplicate detection (R-STU-03).

const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;

/** Strips tashkeel/tatweel, unifies hamza/taa marbuta/ya, lowercases Latin, collapses spaces. */
export function normalizeArabic(input: string): string {
  return input
    .replace(TASHKEEL, '')
    .replace(TATWEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(name: string): string[] {
  return normalizeArabic(name)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** A word joined to the conjunction waw ("and" + name) matches the bare name. */
function sameToken(a: string, b: string): boolean {
  return a === b || a === `و${b}` || b === `و${a}`;
}

/**
 * True when two names likely denote the same person: every word of the shorter name appears in
 * the longer one after normalisation (a taa marbuta or haa ending, a joined second name, an
 * added surname).
 * No typo/edit-distance matching (R-STU-03); whether it is needed is open with the owner.
 */
export function arabicNameSimilar(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (short.length === 0) return false;
  return short.every((s) => long.some((l) => sameToken(s, l)));
}

/**
 * Does any of `fields` contain the search, both normalised (case, tashkeel, hamza / taa marbuta /
 * ya forms ignored, spaces collapsed)? A blank search matches everything.
 */
export function matchesQuery(fields: string | readonly string[], query: string): boolean {
  const q = normalizeArabic(query);
  if (q === '') return true;
  const list = typeof fields === 'string' ? [fields] : fields;
  return list.some((f) => normalizeArabic(f).includes(q));
}
