import { arabicNameSimilar, normalizeArabic } from '@ab/core';

/** Result column of the duplicate compare (R-STU-03, docs/07 §6 Dialog): ✓ same, ≈ near. */
export type Match = 'same' | 'near' | 'differs';

/** Near means equal after Arabic normalisation (ha/ta marbuta, hamza, alif maqsura/ya). */
export function textMatch(typed: string, existing: string): Match {
  if (typed.trim() === existing.trim()) return 'same';
  return normalizeArabic(typed) === normalizeArabic(existing) ? 'near' : 'differs';
}

/** The API already matched student names, so anything but an exact copy is near. */
export function nameMatch(typed: string, existing: string): Match {
  if (typed.trim() === existing.trim()) return 'same';
  return arabicNameSimilar(typed, existing) ? 'near' : 'differs';
}
