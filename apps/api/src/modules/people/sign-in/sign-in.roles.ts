import type { UserRole } from '@ab/catalog';
/** Staff = every base role but the family ones (guardian, student). */
export const isStaff = (role: UserRole): boolean => role !== 'guardian' && role !== 'student';
