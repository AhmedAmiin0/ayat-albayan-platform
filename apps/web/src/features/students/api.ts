import type { Gender, LeadSource } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { ApiError, apiFetch, apiSend } from '@/lib/api';
import type {
  DuplicateBody,
  Page,
  StudentListItem,
  StudentProfile,
  StudentRef,
  TeacherOption,
} from './types';

export const PAGE_SIZE = 20;

/** Invalidate this after any write. */
export const STUDENTS_KEY = ['students'] as const;

export const studentListQuery = (search: string, page: number) =>
  queryOptions({
    queryKey: [...STUDENTS_KEY, 'list', { search, page }],
    queryFn: () => {
      const qs = new URLSearchParams({ search, page: String(page), pageSize: String(PAGE_SIZE) });
      return apiFetch<Page<StudentListItem>>(`/students?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

export const studentQuery = (id: string) =>
  queryOptions({
    queryKey: [...STUDENTS_KEY, id],
    queryFn: () => apiFetch<StudentProfile>(`/students/${id}`),
  });

export const teacherOptionsQuery = queryOptions({
  queryKey: [...STUDENTS_KEY, 'teacher-options'],
  queryFn: () => apiFetch<TeacherOption[]>('/students/teacher-options'),
  staleTime: 5 * 60_000,
});

export type CreateStudentBody = {
  name: string;
  age: number | null;
  gender: Gender | null;
  tz: string;
  program: string;
  teacher_id?: string;
  guardian: { name: string; phone_e164: string; tz: string; source: LeadSource | null };
  force: boolean;
  /** The inbox lead this registration converts (R-LEAD-06). */
  lead_id?: string;
};

export const createStudent = (body: CreateStudentBody) =>
  apiSend<StudentRef>('POST', '/students', body);

export const updateStudent = (id: string, patch: object) =>
  apiSend<StudentProfile>('PATCH', `/students/${id}`, patch);

/** `mergedId` is folded into `keptId`, which survives (R-STU-03). */
export const mergeStudents = ({ keptId, mergedId }: { keptId: string; mergedId: string }) =>
  apiSend<{ merge_id: string }>('POST', `/students/${keptId}/merge`, { merged_id: mergedId });

/** Duplicate candidates from a 409 on create, else null. */
export function duplicateCandidates(error: unknown): StudentRef[] | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const body = error.body as Partial<DuplicateBody> | null;
  return body?.message === 'duplicate_student' && body.candidates ? body.candidates : null;
}
