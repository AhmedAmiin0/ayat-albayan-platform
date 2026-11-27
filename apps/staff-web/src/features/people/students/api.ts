import type { StudentStatus } from '@ab/catalog';
import type { Page } from '@ab/core';
import type { DuplicateStudentBody, StudentListItem, StudentProfile, StudentRef } from '@ab/shared';
import { studentCalls, type StudentCreateBody } from '@ab/client-core';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { ApiError, apiFetch, apiSend } from '@ab/web-kit';
import { sortFilterParams, type FilterSearch, type SortSearch } from '@/lib/list/list-search';
import { studentKeys } from '@/features/people/keys';
import { filterParams, type StudentsFilters } from './list/filters';

export const PAGE_SIZE = 20;

const students = studentCalls({ apiFetch, apiSend });

/** Invalidate this after any write. */
export const STUDENTS_KEY = studentKeys.all;

/** The list filters (R-STU-01), the column sort and text filters (R-NFR-08) of GET /students. */
export type StudentListView = {
  filters?: StudentsFilters;
  sort?: SortSearch;
  columns?: FilterSearch;
};

/** GET /students: search + page, and the filters / sort when given. */
export const studentListQuery = (search: string, page: number, view: StudentListView = {}) =>
  queryOptions({
    queryKey: studentKeys.list({
      search,
      page,
      ...view.filters,
      ...view.sort,
      columns: view.columns,
    }),
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
    queryKey: studentKeys.statusCounts(filters),
    queryFn: () => students.statusCounts(Object.fromEntries(filterParams(filters))),
  });

export const studentQuery = (id: string) =>
  queryOptions({
    queryKey: studentKeys.detail(id),
    queryFn: () => apiFetch<StudentProfile>(`/students/${id}`),
  });

export const teacherOptionsQuery = queryOptions({
  queryKey: studentKeys.teacherOptions(),
  queryFn: () => students.teacherOptions(),
  staleTime: 5 * 60_000,
});

export const createStudent = (body: StudentCreateBody) =>
  apiSend<StudentRef>('POST', '/students', body);

export const updateStudent = students.update;

/** `mergedId` is folded into `keptId`, which survives (R-STU-03). */
export const mergeStudents = students.merge;

/** Duplicate candidates from a 409 on create, else null. */
export function duplicateCandidates(error: unknown): StudentRef[] | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const body = error.body as Partial<DuplicateStudentBody> | null;
  return body?.message === 'duplicate_student' && body.candidates ? body.candidates : null;
}

/** 409 `status_changed`: the student's status moved since the client loaded it (R-STU-05). */
export function isStatusChanged(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) return false;
  const body = error.body as { code?: unknown } | null;
  return body?.code === 'status_changed';
}
