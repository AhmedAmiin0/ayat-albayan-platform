import { teacherCalls } from '@ab/client-core';
import type { AvailabilityRow, TeacherCreate, TeacherListRow, TimeOff } from '@ab/shared';
import type { Page } from '@ab/core';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { sortFilterParams } from '@/lib/list/list-search';
import { teacherKeys } from '@/features/people/keys';
import type { ListUrlState } from '@/lib/list/list-url';

export const PAGE_SIZE = 25;

const teachers = teacherCalls({ apiFetch, apiSend });

/** GET /teachers: the page, column sort and filters (R-NFR-08). */
export const teachersPageQuery = ({ page, sort, filters }: ListUrlState) =>
  queryOptions({
    queryKey: teacherKeys.list({ page, sort, filters }),
    queryFn: () => {
      const qs = new URLSearchParams([
        ['page', String(page)],
        ['pageSize', String(PAGE_SIZE)],
        ...sortFilterParams(sort, filters),
      ]);
      return apiFetch<Page<TeacherListRow>>(`/teachers?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

export const teacherQuery = (id: string) =>
  queryOptions({
    queryKey: teacherKeys.detail(id),
    queryFn: () => teachers.get(id),
  });

/** POST /teachers without an id, else PATCH /teachers/:id (R-TCH-01). */
export const saveTeacher = (
  id: string | null,
  body: TeacherCreate & { username?: string | null },
) => (id ? teachers.update(id, body) : teachers.create(body));

export const availabilityQuery = (id: string) =>
  queryOptions({
    queryKey: teacherKeys.availability(id),
    queryFn: () => apiFetch<AvailabilityRow[]>(`/teachers/${id}/availability`),
  });

export const timeOffQuery = (id: string) =>
  queryOptions({
    queryKey: teacherKeys.timeOff(id),
    queryFn: () => apiFetch<TimeOff[]>(`/teachers/${id}/time-off`),
  });
