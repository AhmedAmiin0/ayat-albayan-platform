// HEART / FIN write names in Latin («Hala», «tala»); the registry in Arabic. Comparing
// consonant skeletons tells siblings on one phone apart (هالة → hl ← Hala). Pure.
// ponytail: crude skeleton (vowels, ع, و/ي dropped; emphatics folded); only used as a tie-break
// between the children of one guardian phone, never to find a student on its own.
import { normalizeArabic } from '@ab/shared';

const AR: Record<string, string> = {
  ب: 'b',
  ت: 't',
  ث: 't',
  ط: 't',
  ج: 'j',
  ح: 'h',
  ه: 'h',
  خ: 'k',
  ق: 'k',
  ك: 'k',
  د: 'd',
  ذ: 'd',
  ض: 'd',
  ر: 'r',
  ز: 'z',
  ظ: 'z',
  س: 's',
  ش: 's',
  ص: 's',
  غ: 'g',
  ف: 'f',
  ل: 'l',
  م: 'm',
  ن: 'n',
};

const LATIN: readonly (readonly [RegExp, string])[] = [
  [/sh|ch/g, 's'],
  [/kh|q|c|x/g, 'k'],
  [/th/g, 't'],
  [/gh/g, '_'], // غ, kept apart from g = ج
  [/dh/g, 'd'],
  [/ph|v/g, 'f'],
  [/p/g, 'b'],
  [/g/g, 'j'],
  [/_/g, 'g'],
  [/[aeiouyw'-]/g, ''],
];

// Doubled letters collapse; a final h is dropped on both sides (ة/ـه/ح ~ «-a», «-ah»).
const squeeze = (s: string): string => s.replace(/(.)\1+/g, '$1').replace(/h$/, '');

export function arabicSkeleton(name: string): string {
  const word = normalizeArabic(name).split(' ')[0] ?? '';
  return squeeze([...word].map((ch) => AR[ch] ?? '').join(''));
}

export function latinSkeleton(name: string): string {
  let s =
    name
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean)[0] ?? '';
  for (const [re, to] of LATIN) s = s.replace(re, to);
  return squeeze(s);
}

export function latinMatchesArabic(latin: string, arabic: string): boolean {
  const l = latinSkeleton(latin);
  return l.length > 0 && l === arabicSkeleton(arabic);
}
