import { studentCalls } from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { studentKeys } from '@/core/lib/keys';

const students = studentCalls({ apiFetch, apiSend });

/** GET /students/:id: the quick view, the subscribe form and the report header share one cache. */
export const studentProfileQuery = (id: string) =>
  queryOptions({ queryKey: studentKeys.one(id), queryFn: () => students.get(id) });
