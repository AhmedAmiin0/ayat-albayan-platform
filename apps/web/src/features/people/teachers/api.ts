import type { AvailabilitySlot, TeacherCreate, TeacherMeetingMode, TeacherStudentCounts } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http/api';
import { sortFilterParams } from '@/lib/list/list-search';
import type { ListUrlState } from '@/lib/list/list-url';

// Shapes returned by apps/api/src/modules/teachers (R-TCH-01, R-TCH-02).
/**
 * `meeting_mode`: the raw column (null = follow settings.meeting_link_auto); `platform_classroom`: what it
 * resolves to now (usesPlatform on the API).
 */
export type Teacher = Omit<TeacherCreate, 'meeting_mode'> & {
  id: string;
  meeting_mode: TeacherMeetingMode | null;
  platform_classroom: boolean;
  /** The teacher's login (null = none yet, created on «المستخدمون») and its sign-in username (docs/30). */
  profile_id?: string | null;
  username?: string | null;
};
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
