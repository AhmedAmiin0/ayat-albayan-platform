import type { AcademySettings } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, pathKey } from '@ab/mobile-kit';

const PATH = '/settings';

/** Values save one key at a time. */
export function useSettings() {
  return useQuery({ queryKey: pathKey(PATH), queryFn: () => apiFetch<AcademySettings>(PATH) });
}
