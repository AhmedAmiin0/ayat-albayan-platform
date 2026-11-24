import type { AcademySettings } from '@ab/settings';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, pathKey } from '@ab/mobile-kit';

const PATH = '/settings';

/** GET /settings (admin). «القيم» saves one key at a time (values/use-save-value). */
export function useSettings() {
  return useQuery({ queryKey: pathKey(PATH), queryFn: () => apiFetch<AcademySettings>(PATH) });
}
