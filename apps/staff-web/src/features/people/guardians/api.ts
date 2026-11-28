import type { GuardianUpdate } from '@ab/shared';
import { guardianCalls } from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { guardianKeys } from '@/features/people/keys';

export const GUARDIANS_KEY = guardianKeys.all;

const guardians = guardianCalls({ apiFetch, apiSend });

/** Same key as the booking wizard's guardian row (same route, every column). */
export const guardianDetailQuery = (id: string) =>
  queryOptions({ queryKey: guardianKeys.detail(id), queryFn: () => guardians.get(id) });

export const updateGuardian = ({ id, patch }: { id: string; patch: GuardianUpdate }) =>
  guardians.update(id, patch);

/** Removes the family's second number; its chat becomes a lead chat again. */
export const removeGuardianPhone = guardians.removePhone;
