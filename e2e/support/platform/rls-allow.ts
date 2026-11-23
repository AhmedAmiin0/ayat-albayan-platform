// Allow-lists of rls-catalogue.sql.spec.ts, built from the CI database: each entry says why
// that client may reach it. Shrink them; a new entry needs the owner's go in its PR.

export const ANON_READABLE: Record<string, string> = {
  translation_overrides: 'the sign-in page shows overridden strings before login (4 columns)',
};

const POLICY_HELPER = 'RLS helper read by policies; it answers only for auth.uid()';
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

const REALTIME_HELPER = 'realtime.messages policies call it for the signed-in user';

export const AUTHENTICATED_DEFINERS: Record<string, string> = {
  ...ANON_DEFINERS,
  'can_read_channel(p_channel uuid)': POLICY_HELPER,
  'inbox_live_reader()': REALTIME_HELPER,
  'is_meeting_creator(p_meeting uuid)': POLICY_HELPER,
  'is_meeting_invitee(p_meeting uuid)': POLICY_HELPER,
  'is_my_sales_lesson(p_lesson uuid)': POLICY_HELPER,
  'is_portal_report_pdf(p_name text)': STORAGE_HELPER,
  'my_sales_guardian_ids()': POLICY_HELPER,
  'my_sales_lead_ids()': POLICY_HELPER,
  'my_sales_phones()': POLICY_HELPER,
  'my_sales_student_ids()': POLICY_HELPER,
  'my_thread_phones()': POLICY_HELPER,
  'portal_student_ids()': POLICY_HELPER,
  'presence_can_watch(p_target uuid)': REALTIME_HELPER,
  'presence_enabled()': REALTIME_HELPER,
  'saved_replies_manager()': POLICY_HELPER,
  'saved_replies_reader()': POLICY_HELPER,
  'student_first_paid_at(p_student uuid)':
    'v_assistant_students reads it; any signed-in user can ask it for any student id',
};
