import { ar } from '../../../common/i18n/server-text';

/**
 * The database writes some reasons itself, as codes ('payment_voided': a refund or a deleted payment undid
 * the commission; 'student_merged': two records of one student became one). Nobody should read a code: the
 * academy's own text for it (ar.assistantReasons, with the admins' overrides) is shown instead. A reason an
 * admin typed is shown as typed.
 */
export function reasonText(reason: string | null): string | null {
  if (reason === null) return null;
  return Object.entries(ar.assistantReasons).find(([code]) => code === reason)?.[1] ?? reason;
}
