import { availabilityCalls, teacherCalls } from '@ab/client-core';
import type { AvailabilitySlot, TimeOffCreate } from '@ab/schedule';
import type { TeacherCreate } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { sortFilterParams } from '@/lib/list/list-search';
import { teacherKeys } from '@/features/people/keys';
import type { ListUrlState } from '@/lib/list/list-url';

export const PAGE_SIZE = 25;

const teachers = teacherCalls({ apiFetch, apiSend });
const availability = availabilityCalls({ apiFetch, apiSend });

/** GET /teachers: the page, column sort and filters (R-NFR-08). */
export const teachersPageQuery = ({ page, sort, filters }: ListUrlState) =>
  queryOptions({
    queryKey: teacherKeys.list({ page, sort, filters }),
    queryFn: () =>
      teachers.list(
        Object.fromEntries([
          ['page', String(page)],
          ['pageSize', String(PAGE_SIZE)],
          ...sortFilterParams(sort, filters),
        ]),
      ),
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
    queryFn: () => availability.grid(id),
  });

export const timeOffQuery = (id: string) =>
  queryOptions({
    queryKey: teacherKeys.timeOff(id),
    queryFn: () => availability.timeOff(id),
  });

/** PUT /teachers/:id/availability: the whole weekly grid at once (R-TCH-02). */
export const saveAvailability = (teacherId: string, slots: AvailabilitySlot[]) =>
  availability.replaceGrid(teacherId, { slots });

export const addTimeOff = (teacherId: string, body: TimeOffCreate) =>
  availability.addTimeOff(teacherId, body);

export const removeTimeOff = (teacherId: string, timeOffId: string) =>
  availability.removeTimeOff({ id: teacherId, timeOffId });
