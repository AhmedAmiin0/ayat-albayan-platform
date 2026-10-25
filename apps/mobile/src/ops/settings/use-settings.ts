import type { AcademySettings } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';

const PATH = '/settings';

/** GET /settings (admin). «القيم» saves one key at a time (values/use-save-value). */
export function useSettings() {
  return useQuery({ queryKey: pathKey(PATH), queryFn: () => apiFetch<AcademySettings>(PATH) });
}
