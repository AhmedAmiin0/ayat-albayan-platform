// Arabic text normalisation for search and duplicate detection (R-STU-03).

const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;

/** Strips tashkeel/tatweel, unifies hamza/taa marbuta/ya forms, lowercases Latin, collapses spaces. */
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

/** "وسهيله" (joined with و) matches "سهيله". */
function sameToken(a: string, b: string): boolean {
  return a === b || a === `و${b}` || b === `و${a}`;
}

/**
 * True when two names likely denote the same person: every word of the shorter name appears in
 * the longer one after normalisation (سهيلة ~ سهيله ~ جود وسهيله, فاطمة ~ فاطمه محمد).
 * TODO(R-STU-03): no typo/edit-distance matching; owner to confirm whether it is needed.
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
