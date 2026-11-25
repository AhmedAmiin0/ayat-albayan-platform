import type { FamilyLessonInput } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { familySlotsQuery } from './api';

/** Free starts for one week, on the student's clock. */
export function useFamilySlots(input: FamilyLessonInput & { from: string; to: string }) {
  const slots = useQuery(familySlotsQuery(input));
  return { data: slots.data?.slots, isError: slots.isError, refetch: slots.refetch };
}
