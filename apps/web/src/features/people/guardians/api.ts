import type { LeadSource } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';

// apps/api/src/modules/guardians (R-STU-02, R-STU-04): GET / PATCH /guardians/:id, admin only.

export const GUARDIANS_KEY = ['guardians'] as const;

export type GuardianDetail = {
  id: string;
  name: string;
  phone_e164: string;
  country: string | null;
  tz: string;
  source: LeadSource | null;
  notes: string | null;
};

/** Same key as the booking wizard's guardian row (same endpoint, every column). */
export const guardianDetailQuery = (id: string) =>
  queryOptions({
    queryKey: [...GUARDIANS_KEY, id],
    queryFn: () => apiFetch<GuardianDetail>(`/guardians/${id}`),
  });

export const updateGuardian = ({ id, patch }: { id: string; patch: object }) =>
  apiSend<GuardianDetail>('PATCH', `/guardians/${id}`, patch);
