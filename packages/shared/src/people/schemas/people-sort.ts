import { z } from 'zod';
import { PROGRAMS, TEACHER_STATUSES } from '../../enums/index.js';
import { listSortShape } from '@ab/core';

// Sort keys + column filters of the people lists (R-NFR-08): the API allowlists them, the web
// uses the same keys for `sort=` and `f_<key>`. Text filters are «contains», trimmed, ≤ 100 chars.

const text = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined),
  z.string().max(100).optional(),
);
const blank = (v: unknown) => (v === '' || v === null ? undefined : v);

/** GET /students (and the teacher profile's students tab). */
export const STUDENT_SORT_KEYS = ['code', 'name', 'guardian', 'program', 'teacher', 'status', 'remaining', 'weekly'] as const;
export type StudentSortKey = (typeof STUDENT_SORT_KEYS)[number];
/** Column text filters of GET /students, beside studentListFiltersSchema. */
export const STUDENT_TEXT_FILTER_KEYS = ['code', 'name', 'guardian'] as const;
export const studentColumnQueryShape = {
  ...listSortShape(STUDENT_SORT_KEYS),
  code: text,
  name: text,
  guardian: text,
};

/** GET /teachers. */
export const TEACHER_SORT_KEYS = ['name', 'programs', 'phone', 'max_students', 'status'] as const;
export const TEACHER_FILTER_KEYS = ['name', 'phone', 'programs', 'status'] as const;
export const teacherColumnQueryShape = {
  ...listSortShape(TEACHER_SORT_KEYS),
  name: text,
  phone: text,
  programs: z.preprocess(blank, z.enum(PROGRAMS).optional()),
  status: z.preprocess(blank, z.enum(TEACHER_STATUSES).optional()),
};

/** «موجود / غير موجود» filter of a link column (CV, recitation). */
export const PRESENCE_FILTERS = ['yes', 'no'] as const;
export type PresenceFilter = (typeof PRESENCE_FILTERS)[number];
const presence = z.preprocess(blank, z.enum(PRESENCE_FILTERS).optional());

/** GET /job-applicants (status stays the endpoint's own param). */
export const APPLICANT_SORT_KEYS = ['name', 'phone', 'status', 'cv', 'recitation', 'notes', 'created_at'] as const;
export const APPLICANT_FILTER_KEYS = ['name', 'phone', 'status', 'cv', 'recitation', 'notes'] as const;
export const applicantColumnQueryShape = {
  ...listSortShape(APPLICANT_SORT_KEYS),
  name: text,
  phone: text,
  cv: presence,
  recitation: presence,
  notes: text,
};

/** GET /leads (status, source, q stay the endpoint's own params). */
export const LEAD_SORT_KEYS = ['last_inbound', 'created_at', 'name', 'status', 'source'] as const;
export type LeadSortKey = (typeof LEAD_SORT_KEYS)[number];
/** assignee=none → leads nobody follows up yet. */
export const NO_ASSIGNEE = 'none';
export const leadColumnQueryShape = {
  ...listSortShape(LEAD_SORT_KEYS),
  assignee: z.preprocess(blank, z.union([z.literal(NO_ASSIGNEE), z.guid()]).optional()),
};
