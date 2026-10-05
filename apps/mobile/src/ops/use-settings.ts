import type { AcademySettings, SettingsUpdate } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';

const PATH = '/settings';

/** GET /settings (admin). */
export function useSettings() {
  return useQuery({ queryKey: pathKey(PATH), queryFn: () => apiFetch<AcademySettings>(PATH) });
}

/** PATCH /settings: the server's copy replaces the cached one. */
export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SettingsUpdate) => apiSend<AcademySettings>('PATCH', PATH, body),
    onSuccess: (saved) => qc.setQueryData(pathKey(PATH), saved),
  });
}
