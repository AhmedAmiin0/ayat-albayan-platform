import {
  teacherCreateSchema,
  type Gender,
  type Program,
  type TeacherCreate,
  type TeacherMeetingMode,
  type TeacherStatus,
} from '@ab/shared';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import type { Teacher } from '../api';

/** Rate column per lesson duration (EGP). R-TCH-01. */
export const RATE_FIELDS = [
  { key: 'rate_30', label: t.teachers.rate30 },
  { key: 'rate_45', label: t.teachers.rate45 },
  { key: 'rate_60', label: t.teachers.rate60 },
  { key: 'rate_90', label: t.teachers.rate90 },
] as const;
type NumberKey = (typeof RATE_FIELDS)[number]['key'] | 'max_students';

/** Form state: every input is a string, as typed. */
export type TeacherForm = {
  display_name_ar: string;
  display_name_en: string;
  gender: Gender;
  programs: Program[];
  phone_e164: string;
  meeting_link: string;
  /** null = «حسب إعداد الأكاديمية» (settings.meeting_link_auto). */
  meeting_mode: TeacherMeetingMode | null;
  status: TeacherStatus;
  tz: string;
} & Record<NumberKey, string>;
export type SetField = <K extends keyof TeacherForm>(key: K, value: TeacherForm[K]) => void;

const NUMBER_KEYS: NumberKey[] = ['rate_30', 'rate_45', 'rate_60', 'rate_90', 'max_students'];

export function emptyTeacherForm(): TeacherForm {
  return {
    display_name_ar: '',
    display_name_en: '',
    gender: 'female',
    programs: ['quran'],
    phone_e164: '',
    meeting_link: '',
    meeting_mode: null,
    status: 'active',
    tz: 'Africa/Cairo',
    rate_30: '',
    rate_45: '',
    rate_60: '',
    rate_90: '',
    max_students: '',
  };
}

const num = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

export function toTeacherForm(teacher: Teacher): TeacherForm {
  return {
    display_name_ar: teacher.display_name_ar,
    display_name_en: teacher.display_name_en ?? '',
    gender: teacher.gender,
    programs: teacher.programs,
    phone_e164: teacher.phone_e164 ?? '',
    meeting_link: teacher.meeting_link ?? '',
    meeting_mode: teacher.meeting_mode,
    status: teacher.status,
    tz: teacher.tz,
    rate_30: num(teacher.rate_30),
    rate_45: num(teacher.rate_45),
    rate_60: num(teacher.rate_60),
    rate_90: num(teacher.rate_90),
    max_students: num(teacher.max_students),
  };
}

const blankToNull = (v: string) => (v.trim() === '' ? null : v.trim());

type Issue = { path: string; message: string };
export type FormResult = { ok: true; payload: TeacherCreate } | { ok: false; error: string };

/** Validates with the shared schema (same rules as the API) → payload or Arabic message. */
export function validateTeacher(form: TeacherForm): FormResult {
  const input = {
    ...form,
    display_name_en: blankToNull(form.display_name_en),
    phone_e164: blankToNull(form.phone_e164),
    meeting_link: blankToNull(form.meeting_link),
    ...Object.fromEntries(NUMBER_KEYS.map((k) => [k, form[k] === '' ? null : Number(form[k])])),
  };
  const result = teacherCreateSchema.safeParse(input);
  if (result.success) return { ok: true, payload: result.data };
  const first = result.error.issues[0];
  return { ok: false, error: issueMessage({ path: String(first?.path[0] ?? ''), message: first?.message ?? '' }) };
}

const PHONE_ERRORS: Record<string, string | undefined> = t.common.phoneErrors;

export function issueMessage(issue: Issue): string {
  const phone = PHONE_ERRORS[issue.message];
  if (phone) return phone;
  if (issue.message === 'invalid_time_zone') return t.common.invalidTimeZone;
  if (issue.path === 'programs') return t.teachers.programsRequired;
  if (issue.path === 'meeting_link') return t.teachers.invalidLink;
  if (issue.path === 'display_name_ar') return t.common.required;
  if (NUMBER_KEYS.some((k) => k === issue.path)) return t.teachers.invalidNumber;
  return t.common.error;
}

/** API failure → Arabic message (409 = duplicate phone, 400 = first validation issue). */
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return t.common.error;
  if (error.status === 409) return t.teachers.phoneTaken;
  const body = error.body as { issues?: Issue[] } | null;
  const first = body?.issues?.[0];
  return error.status === 400 && first ? issueMessage(first) : t.common.error;
}
