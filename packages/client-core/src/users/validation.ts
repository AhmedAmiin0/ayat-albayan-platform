import { DEFAULT_PASSWORD_MIN, needsExistingRecord, normalizePhone, passwordProblem } from '@ab/shared';
import type { CreateForm } from './create-form.js';
import type { EditForm } from './edit-form.js';

/** The app's `t.users.validation` and `t.common.phoneErrors` (each app injects its own `t`). */
export interface UserCheckText {
  validation: { email: string; name: string; passwordBlank: string; passwordShort: string; passwordLong: string; teacherName: string; linkRequired: string };
  phoneErrors: { not_a_number: string; invalid_length: string; missing_country_code: string };
}

export type FieldKey = 'email' | 'full_name' | 'phone' | 'password' | 'linked' | 'teacher_name';
export type FormErrors = Partial<Record<FieldKey, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The create / edit checks of «المستخدمون», with the messages of the app's language (read on every call). */
export function userChecks(text: () => UserCheckText) {
  const V = () => text().validation;
  const emailError = (v: string): string | undefined => (EMAIL.test(v.trim()) && v.trim().length <= 254 ? undefined : V().email);
  const nameError = (v: string): string | undefined => (v.trim().length >= 2 && v.trim().length <= 120 ? undefined : V().name);

  /** Blank is fine (optional); otherwise the shared normaliser decides. */
  function phoneError(v: string): string | undefined {
    if (v.trim() === '') return undefined;
    const r = normalizePhone(v);
    return r.ok ? undefined : text().phoneErrors[r.reason === 'empty' ? 'invalid_length' : r.reason];
  }

  /** A typed password against the API's minimum (shared rule). */
  function passwordError(v: string, min: number = DEFAULT_PASSWORD_MIN): string | undefined {
    const problem = passwordProblem(v, min);
    if (!problem) return undefined;
    if (problem === 'blank') return V().passwordBlank;
    return problem === 'too_short' ? V().passwordShort.replace('{n}', String(min)) : V().passwordLong;
  }

  function linkErrors(f: CreateForm): FormErrors {
    if (f.role === 'teacher' && f.teacherMode === 'new') {
      return f.newTeacher.display_name_ar.trim().length >= 2 ? {} : { teacher_name: V().teacherName };
    }
    const needs = needsExistingRecord(f.role) || f.role === 'teacher';
    return needs && !f.linked ? { linked: V().linkRequired } : {};
  }

  function collect(out: FormErrors, checks: readonly (readonly [FieldKey, string | undefined])[]): FormErrors {
    for (const [key, message] of checks) if (message) out[key] = message;
    return out;
  }

  const createErrors = (f: CreateForm): FormErrors =>
    collect({ ...linkErrors(f) }, [
      ['email', emailError(f.email)],
      ['full_name', nameError(f.full_name)],
      ['phone', phoneError(f.phone)],
      ['password', f.credential === 'set' ? passwordError(f.password) : undefined],
    ]);

  const editErrors = (f: EditForm): FormErrors =>
    collect({}, [
      ['email', emailError(f.email)],
      ['full_name', nameError(f.full_name)],
      ['phone', phoneError(f.phone)],
    ]);

  return { emailError, nameError, phoneError, passwordError, createErrors, editErrors };
}
