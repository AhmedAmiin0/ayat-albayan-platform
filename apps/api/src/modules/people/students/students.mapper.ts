import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import { normalizeArabic, type StudentUpdate } from '@ab/shared';
import { orSafe } from '../guardians/http';
import type { StudentCreateRequest } from './students.dto';

type Student = Tables<'students'>;
type Sibling = Pick<Student, 'id' | 'code' | 'name' | 'status'>;

export type StudentListRow = Pick<
  Student,
  'id' | 'code' | 'name' | 'status' | 'program' | 'tz' | 'created_at'
> & {
  /** Newest package's remaining lessons; null without a package (v_student_list). */
  package_remaining: number | null;
  /** On an active weekly schedule rule. */
  has_weekly: boolean;
  guardian: { name: string; phone_e164: string };
  teacher: { display_name_ar: string } | null;
};

export type StudentListItem = Omit<StudentListRow, 'guardian' | 'teacher'> & {
  guardian_name: string;
  guardian_phone: string;
  teacher_name: string | null;
};

export type StudentProfileRow = Student & {
  /** phones: every family number, the main one (is_primary) and a second one (guardian_phones, 2026-10-29). */
  guardian: { id: string; name: string; phone_e164: string; students: Sibling[]; phones: { phone_e164: string; is_primary: boolean }[] };
  teacher: { id: string; display_name_ar: string; meeting_link: string | null } | null;
};

export type StudentProfile = StudentProfileRow & {
  /** Effective join link: the override, else the teacher's fixed link (R-STU-05, R-LES-02). */
  meeting_link: string | null;
  /** Other students of the same guardian — merge candidates on the profile page. */
  siblings: Sibling[];
};

type InsertOpts = { dto: StudentCreateRequest; guardianId: string; actorId: string };

/** Request → row: drops request-only keys, adds name_normalized (R-STU-03) and created_by. */
export function toStudentInsert({ dto, guardianId, actorId }: InsertOpts): TablesInsert<'students'> {
  // Request-only keys are dropped by the rest spread.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { guardian, guardian_id, force, lead_id, ...student } = dto;
  return {
    ...student,
    guardian_id: guardianId,
    name_normalized: normalizeArabic(student.name),
    created_by: actorId,
  };
}

export function toStudentPatch(dto: Omit<StudentUpdate, 'expected_status'>): TablesUpdate<'students'> {
  return dto.name === undefined ? dto : { ...dto, name_normalized: normalizeArabic(dto.name) };
}

export function toListItem({ guardian, teacher, ...row }: StudentListRow): StudentListItem {
  return {
    ...row,
    guardian_name: guardian.name,
    guardian_phone: guardian.phone_e164,
    teacher_name: teacher?.display_name_ar ?? null,
  };
}

export function toProfile(row: StudentProfileRow): StudentProfile {
  return {
    ...row,
    meeting_link: row.meeting_link_override ?? row.teacher?.meeting_link ?? null,
    siblings: row.guardian.students.filter((s) => s.id !== row.id),
  };
}

/** PostgREST or() filter on name (Arabic-normalised, so سهيلة finds سهيله) or code. */
export function studentNameOrCodeFilter(term: string): string | null {
  const name = orSafe(normalizeArabic(term));
  const code = orSafe(term);
  return name ? `name_normalized.ilike.*${name}*,code.ilike.*${code}*` : null;
}

/** PostgREST or() filter for a digit search: a guardian whose phone has the digits, or the code. */
export function studentPhoneOrCodeFilter(guardianIds: readonly string[], digits: string): string {
  const code = `code.ilike.*${digits}*`;
  return guardianIds.length > 0 ? `guardian_id.in.(${guardianIds.join(',')}),${code}` : code;
}
