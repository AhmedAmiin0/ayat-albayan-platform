import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import {
  studentListItemSchema,
  studentProfileSchema,
  type StudentListItemView as StudentListItem,
  type StudentProfileView as StudentProfile,
  type StudentCreateRequest,
  type StudentUpdate,
} from '@ab/shared';
import { normalizeArabic } from '@ab/core';
import { orFilterTerm } from '@/common/db/or-filter';
import { asResponse } from '@/common/http/returns';

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

/** A v_student_list row with students.is_test (docs/56) read beside it. */
export type StudentListInput = StudentListRow & { is_test: boolean };

export type StudentProfileRow = Student & {
  /** phones: every family number, the main one (is_primary) and a second one (guardian_phones). */
  guardian: {
    id: string;
    name: string;
    phone_e164: string;
    students: Sibling[];
    phones: { phone_e164: string; is_primary: boolean }[];
  };
  teacher: {
    id: string;
    display_name_ar: string;
    display_name_en: string | null;
    meeting_link: string | null;
  } | null;
};

interface InsertOpts { dto: StudentCreateRequest; guardianId: string; actorId: string }

/** Request → row: drops request-only keys, adds name_normalized (R-STU-03) and created_by. */
export function toStudentInsert({
  dto,
  guardianId,
  actorId,
}: InsertOpts): TablesInsert<'students'> {
  // Request-only keys are dropped by the rest spread (no-unused-vars ignores rest siblings).
  const { guardian, guardian_id, force, lead_id, ...student } = dto;
  return {
    ...student,
    guardian_id: guardianId,
    name_normalized: normalizeArabic(student.name),
    created_by: actorId,
  };
}

export function toStudentPatch(
  dto: Omit<StudentUpdate, 'expected_status'>,
): TablesUpdate<'students'> {
  return dto.name === undefined ? dto : { ...dto, name_normalized: normalizeArabic(dto.name) };
}

export function toListItem({ guardian, teacher, ...row }: StudentListInput): StudentListItem {
  return asResponse(studentListItemSchema, {
    ...row,
    guardian_name: guardian.name,
    guardian_phone: guardian.phone_e164,
    teacher_name: teacher?.display_name_ar ?? null,
  });
}

/** The join link is the override, else the teacher's fixed link (R-STU-05, R-LES-02). */
export function toProfile(row: StudentProfileRow): StudentProfile {
  return asResponse(studentProfileSchema, {
    ...row,
    meeting_link: row.meeting_link_override ?? row.teacher?.meeting_link ?? null,
    siblings: row.guardian.students.filter((s) => s.id !== row.id),
  });
}

/** Name is Arabic-normalised so spelling variants match. */
export function studentNameOrCodeFilter(term: string): string | null {
  const name = orFilterTerm(normalizeArabic(term));
  const code = orFilterTerm(term);
  return name ? `name_normalized.ilike.*${name}*,code.ilike.*${code}*` : null;
}

/** PostgREST or() filter for a digit search: a guardian whose phone has the digits, or the code. */
export function studentPhoneOrCodeFilter(guardianIds: readonly string[], digits: string): string {
  const code = `code.ilike.*${digits}*`;
  return guardianIds.length > 0 ? `guardian_id.in.(${guardianIds.join(',')}),${code}` : code;
}
