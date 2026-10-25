import type { Gender, LeadSource, StudentStatus } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { ApiError, apiFetch, apiSend } from '@/lib/http/api';
import { sortFilterParams, type FilterSearch, type SortSearch } from '@/lib/list/list-search';
import { filterParams, type StudentsFilters } from './filters';
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

/** The list filters (R-STU-01), the column sort and text filters (R-NFR-08) of GET /students. */
export type StudentListView = { filters?: StudentsFilters; sort?: SortSearch; columns?: FilterSearch };

/** GET /students: search + page, and the filters / sort when given. */
export const studentListQuery = (search: string, page: number, view: StudentListView = {}) =>
  queryOptions({
    queryKey: [...STUDENTS_KEY, 'list', { search, page, ...view.filters, ...view.sort, columns: view.columns }],
    queryFn: () => {
      const qs = new URLSearchParams([
        ['search', search],
        ['page', String(page)],
        ['pageSize', String(PAGE_SIZE)],
        ...filterParams(view.filters ?? {}),
        ...sortFilterParams(view.sort ?? {}, view.columns),
      ]);
      return apiFetch<Page<StudentListItem>>(`/students?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

export type StatusCounts = Record<StudentStatus, number>;

/** Students per status under the other filters (status itself ignored), e.g. one teacher's. */
export const studentStatusCountsQuery = (filters: StudentsFilters) =>
  queryOptions({
    queryKey: [...STUDENTS_KEY, 'status-counts', filters],
    queryFn: () => apiFetch<StatusCounts>(`/students/status-counts?${new URLSearchParams(filterParams(filters))}`),
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

/** 409 `status_changed`: the student's status moved since the client loaded it (R-STU-05). */
export function isStatusChanged(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) return false;
  const body = error.body as { code?: unknown } | null;
  return body?.code === 'status_changed';
}
