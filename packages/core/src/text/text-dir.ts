// The direction of user-authored text (a chat message, a note, a name) from its first strong letter,
// as Unicode's first-strong rule reads it. The UI language sets the layout; this sets content alignment.
export type TextDir = 'rtl' | 'ltr';

// The letters of Hebrew, Arabic, Syriac, Thaana, NKo … Arabic Extended, the RTL presentation forms, RLM, and the
// RTL blocks above U+FFFF (Imperial Aramaic … Adlam, Arabic math letters). LRM counts as an ltr strong mark.
const RTL = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF\u200F\u{10800}-\u{10FFF}\u{1E800}-\u{1EFFF}]/u;
const LETTER = /[\p{L}\u200E\u200F]/u;
// FSI/LRI/RLI … PDI: an isolated run never decides the paragraph's direction.
const ISOLATE = /[\u2066-\u2068][^\u2069]*(\u2069|$)/gu;

/** 'rtl' or 'ltr' by the first strong letter outside isolates; null when there is none (digits only, empty). */
export function textDir(s: string): TextDir | null {
  for (const ch of s.replace(ISOLATE, '')) {
    if (LETTER.test(ch)) return RTL.test(ch) ? 'rtl' : 'ltr'; // Arabic-Indic digits and harakat are weak
  }
  return null;
}

