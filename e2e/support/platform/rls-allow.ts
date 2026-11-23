// Allow-lists of rls-catalogue.sql.spec.ts, built from the CI database: each entry says why
// that client may reach it. Shrink them; a new entry needs the owner's go in its PR.

export const ANON_READABLE: Record<string, string> = {
  translation_overrides: 'the sign-in page shows overridden strings before login (4 columns)',
};

const POLICY_HELPER = 'RLS helper read by policies; for anon auth.uid() is null, so it grants nothing';
const STORAGE_HELPER = 'storage.objects policies call it, and they are evaluated for anon too';

export const ANON_DEFINERS: Record<string, string> = {
  'auth_role()': POLICY_HELPER,
  'is_admin()': POLICY_HELPER,
  'is_my_assisted_lesson(p_lesson uuid)': POLICY_HELPER,
  'is_my_lesson(p_lesson uuid)': POLICY_HELPER,
  'is_my_report(p_report uuid)': POLICY_HELPER,
  'is_my_report_pdf(p_name text)': STORAGE_HELPER,
  'my_assisted_student_ids()': POLICY_HELPER,
  'my_teacher_id()': POLICY_HELPER,
  'report_of_path(p_name text)': STORAGE_HELPER,
};

export const AUTHENTICATED_DEFINERS: Record<string, string> = {
  ...ANON_DEFINERS,
};
