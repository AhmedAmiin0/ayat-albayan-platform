import type { AcademySettings, SettingsUpdate } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';

/** GET /settings (admin): every academy setting with its default filled in. */
export const settingsQuery = queryOptions({
  queryKey: ['settings'],
  queryFn: () => apiFetch<AcademySettings>('/settings'),
});

/** PATCH /settings (audited): only the keys sent change. */
export const updateSettings = (body: SettingsUpdate) => apiSend<AcademySettings>('PATCH', '/settings', body);
