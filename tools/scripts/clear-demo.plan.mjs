// Pure row selection for `pnpm clear:demo`: exactly the rows tools/scripts/seed-demo.mjs writes.
// Each table is matched by the key the seed upserts on (phone; guardian phone + student name) AND
// by the seed's marker, so a real row that happens to share a phone is never selected.
import { APPLICANTS, DEMO_NOTE, FAMILIES, LEADS, TEACHERS } from './seed-demo.data.mjs';

/** Same as seed-demo: local DB, or the hosted STAGING project with an explicit flag. Never prod. */
export const STAGING_REF = 'knxfwiimjcifwckhwbim';

export function allowedTarget(url, argv) {
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const isStaging = argv.includes('--allow-remote-staging') && url.includes(STAGING_REF);
  return isLocal || isStaging;
}

/** FK-safe: rows that point at others go first (leads → guardians, students → guardians/teachers). */
export const DELETE_ORDER = [
  'job_applicants',
  'leads',
  'students',
  'guardians',
  'teacher_time_off',
  'teacher_availability',
  'teachers',
];

/** Student key as the delete compares it: `${guardian phone}|${student name}`. */
export const studentKey = (phone, name) => `${phone}|${name}`;

export function demoSelection(data = { APPLICANTS, FAMILIES, LEADS, TEACHERS }) {
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
