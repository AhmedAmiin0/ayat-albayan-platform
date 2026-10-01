import { arabicNameSimilar, normalizeArabic } from '@ab/shared';

/** Result column of the duplicate compare (R-STU-03, docs/07 §6 Dialog): ✓ same, ≈ near. */
export type Match = 'same' | 'near' | 'differs';

/** Exact (trimmed) → same; equal after Arabic normalisation (ه/ة, hamza, ى/ي) → near. */
export function textMatch(typed: string, existing: string): Match {
  if (typed.trim() === existing.trim()) return 'same';
  return normalizeArabic(typed) === normalizeArabic(existing) ? 'near' : 'differs';
}

/** Student names: the API already matched them, so anything but an exact copy is «اسم قريب». */
export function nameMatch(typed: string, existing: string): Match {
  if (typed.trim() === existing.trim()) return 'same';
  return arabicNameSimilar(typed, existing) ? 'near' : 'differs';
}
