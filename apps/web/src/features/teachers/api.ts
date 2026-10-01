import type { AvailabilitySlot, TeacherCreate } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

// Shapes returned by apps/api/src/modules/teachers (R-TCH-01, R-TCH-02).
export type Teacher = TeacherCreate & { id: string };
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
export type AvailabilityRow = AvailabilitySlot & { id: string };
export type TimeOff = { id: string; starts_at: string; ends_at: string; reason: string | null };

export const PAGE_SIZE = 25;

export const teachersPageQuery = (page: number) =>
  queryOptions({
    queryKey: ['teachers', 'list', page],
    queryFn: () => apiFetch<Page<Teacher>>(`/teachers?page=${page}&pageSize=${PAGE_SIZE}`),
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
