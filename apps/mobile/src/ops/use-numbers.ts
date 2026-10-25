import type { NumberView, ParityView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';

export const NUMBERS_PATH = '/admin/numbers';
export const PARITY_PATH = '/admin/communications/parity';

/** GET /admin/numbers (settings.read): read-only on the phone (docs/23 §3 phase 3). */
export function useNumbers() {
  return useQuery({ queryKey: pathKey(NUMBERS_PATH), queryFn: () => apiFetch<NumberView[]>(NUMBERS_PATH) });
}

/** GET /admin/communications/parity (settings.read): the source in use and the differences. */
export function useParity() {
  return useQuery({ queryKey: pathKey(PARITY_PATH), queryFn: () => apiFetch<ParityView>(PARITY_PATH) });
}
