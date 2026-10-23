import type { AcademySettings } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';

const PATH = '/settings';

/** GET /settings (admin). «القيم» saves one key at a time (values/use-save-value). */
export function useSettings() {
  return useQuery({ queryKey: pathKey(PATH), queryFn: () => apiFetch<AcademySettings>(PATH) });
}
