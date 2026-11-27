import { communicationsCalls, numbersCalls } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

export const NUMBERS_PATH = '/admin/numbers';
export const PARITY_PATH = '/admin/communications/parity';

const communications = communicationsCalls({ apiFetch, apiSend });
const numbers = numbersCalls({ apiFetch, apiSend });

/** Read-only on the phone (docs/23 §3 phase 3). */
export function useNumbers() {
  return useQuery({
    queryKey: pathKey(NUMBERS_PATH),
    queryFn: numbers.list,
  });
}

/** The source in use and the differences (settings.read). */
export function useParity() {
  return useQuery({
    queryKey: pathKey(PARITY_PATH),
    queryFn: communications.parity,
  });
}
