// Pure row selection for `pnpm clear:demo`: exactly the rows tools/scripts/seed-demo.mjs writes.
// Each table is matched by the key the seed upserts on (phone; guardian phone + student name) AND
// by the seed's marker, so a real row that happens to share a phone is never selected.
import { APPLICANTS, DEMO_NOTE, FAMILIES, LEADS, TEACHERS } from './seed-demo.data.mjs';
import { TEST_FAMILY, TEST_TEACHER } from './seed-test-account.data.mjs';

/** seed-demo's rows plus the test account's (seed-test-account.mjs; its login stays: --remove). */
export const DEMO_DATA = {
  APPLICANTS,
  LEADS,
  TEACHERS: [...TEACHERS, TEST_TEACHER],
  FAMILIES: [...FAMILIES, { phone: TEST_FAMILY.phone, students: [TEST_FAMILY.student] }],
};

/** Hosted STAGING project (same pooler/user as tools/migrate/src/config.ts). */
export const STAGING_REF = 'knxfwiimjcifwckhwbim';
const STAGING_POOLER = 'aws-1-eu-central-1.pooler.supabase.com';
const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];

/** seed:demo + clear:demo guard: local DB, or STAGING with --allow-remote-staging. Never prod. */
export function allowedTarget(url, argv) {
  if (!URL.canParse(url)) return false;
  const u = new URL(url);
  if (LOCAL_HOSTS.includes(u.hostname)) return true;
  const user = decodeURIComponent(u.username);
  const isStaging =
    (u.hostname === STAGING_POOLER && user === `postgres.${STAGING_REF}`) ||
    u.hostname === `db.${STAGING_REF}.supabase.co`;
  return isStaging && argv.includes('--allow-remote-staging');
}

/**
 * App rows that point at demo people through ON DELETE SET NULL. Deleting the person would quietly
 * detach them, so clear:demo refuses while any exist (NO ACTION FKs refuse on their own).
 */
export const SET_NULL_DEPENDENTS = [
  { table: 'job_applicants', column: 'from_lead_id', parent: 'leads' },
  { table: 'schedule_rules', column: 'created_from_lead_id', parent: 'leads' },
  { table: 'messages', column: 'lead_id', parent: 'leads' },
  { table: 'messages', column: 'guardian_id', parent: 'guardians' },
  // A reply a demo teacher sent from the inbox keeps its «بعتها:» (migration 164).
  { table: 'messages', column: 'sent_by_teacher_id', parent: 'teachers' },
  // A WhatsApp call with a demo family keeps its chat links (docs/28).
  { table: 'wa_calls', column: 'lead_id', parent: 'leads' },
  { table: 'wa_calls', column: 'guardian_id', parent: 'guardians' },
];

/** FK-safe: rows that point at others go first (leads → guardians, students → guardians/teachers). */
export const DELETE_ORDER = [
  'job_applicants',
  'leads',
  // Assistant assignments of the demo students only (migration 181); the assistants' logins stay.
  'student_assistants',
  // The demo students' own classroom links (migration 191).
  'student_join_links',
  // The demo students' teacher–family channels, their messages and read marks (migration 800, docs/31).
  'channel_reads',
  // Their edit / delete history (migration 986), before the messages it points at.
  'channel_message_edits',
  'channel_messages',
  'student_channels',
  'students',
  // The demo families' numbers (migration 973); a second number linked to one makes clear:demo refuse.
  'guardian_phones',
  'guardians',
  'teacher_time_off',
  'teacher_availability',
  // The demo teacher's own read marks (migration 164); nobody else's.
  'teacher_thread_reads',
  'teachers',
];

/** Student key as the delete compares it: `${guardian phone}|${student name}`. */
export const studentKey = (phone, name) => `${phone}|${name}`;

export function demoSelection(data = DEMO_DATA) {
  return {
    note: DEMO_NOTE,
    teacherNameSuffix: ' (DEMO)',
    teacherPhones: data.TEACHERS.map((t) => t.phone),
    guardianPhones: data.FAMILIES.map((f) => f.phone),
    studentKeys: data.FAMILIES.flatMap((f) => f.students.map((s) => studentKey(f.phone, s.name))),
    leadPhones: data.LEADS.map((l) => l.phone),
    applicantPhones: data.APPLICANTS.map((a) => a.phone),
  };
}
