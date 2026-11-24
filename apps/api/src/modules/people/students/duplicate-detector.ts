import type { Tables } from '@ab/db';
import { arabicNameSimilar } from '@ab/core';

export type DuplicateCandidate = Pick<Tables<'students'>, 'id' | 'code' | 'name' | 'status'>;

/** R-STU-03: phone is unique, so same phone means same guardian; names match after normalising. */
export function detectDuplicates<T extends { name: string }>(name: string, students: T[]): T[] {
  return students.filter((s) => arabicNameSimilar(name, s.name));
}
