import type { AvailabilitySlot, TeacherCreate, TeacherStudentCounts } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { sortFilterParams } from '@/lib/list-search';
import type { ListUrlState } from '@/lib/list-url';

// Shapes returned by apps/api/src/modules/teachers (R-TCH-01, R-TCH-02).
export type Teacher = TeacherCreate & { id: string };
/** A row of GET /teachers: the teacher and their current students by kind («مشترك · تجريبي»). */
export type TeacherListRow = Teacher & TeacherStudentCounts;
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
export type AvailabilityRow = AvailabilitySlot & { id: string };
export type TimeOff = { id: string; starts_at: string; ends_at: string; reason: string | null };

export const PAGE_SIZE = 25;

/** GET /teachers: the page, column sort and filters (R-NFR-08). */
export const teachersPageQuery = ({ page, sort, filters }: ListUrlState) =>
  queryOptions({
    queryKey: ['teachers', 'list', page, sort, filters],
    queryFn: () => {
      const qs = new URLSearchParams([['page', String(page)], ['pageSize', String(PAGE_SIZE)], ...sortFilterParams(sort, filters)]);
      return apiFetch<Page<TeacherListRow>>(`/teachers?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

export const teacherQuery = (id: string) =>
  queryOptions({
    queryKey: ['teachers', id],
    queryFn: () => apiFetch<Teacher>(`/teachers/${id}`),
  });

export const availabilityQuery = (id: string) =>
  queryOptions({
    queryKey: ['teachers', id, 'availability'],
    queryFn: () => apiFetch<AvailabilityRow[]>(`/teachers/${id}/availability`),
  });

export const timeOffQuery = (id: string) =>
  queryOptions({
    queryKey: ['teachers', id, 'time-off'],
    queryFn: () => apiFetch<TimeOff[]>(`/teachers/${id}/time-off`),
  });
