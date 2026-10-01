import type { Tables } from '@ab/db';
import { arabicNameSimilar } from '@ab/shared';

export type DuplicateCandidate = Pick<Tables<'students'>, 'id' | 'code' | 'name' | 'status'>;

/**
 * DuplicateDetector (R-STU-03): same guardian phone + similar name.
 * guardians.phone_e164 is unique, so "same phone" is "same guardian": pass that guardian's
 * students and get back the ones whose name matches after Arabic normalisation
 * (سهيلة ~ سهيله ~ جود وسهيله). Siblings with other names (سهيلة / جودي) are not candidates.
 */
export function detectDuplicates<T extends { name: string }>(name: string, students: T[]): T[] {
  return students.filter((s) => arabicNameSimilar(name, s.name));
}
