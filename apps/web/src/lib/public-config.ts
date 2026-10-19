import {
  joinWindowConfig,
  PUBLIC_SETTING_DEFAULTS,
  uploadMaxBytes,
  type JoinWindowConfig,
  type PublicConfig,
  type PublicSettings,
} from '@ab/shared';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { apiFetch } from './api';

/**
 * GET /settings/public (no login): the academy settings every screen may read — the classroom join
 * window, the makeup window, the upload limit, the academy's WhatsApp. Kept 5 minutes; the admin's
 * save invalidates it. Until it answers (or if it fails) the registry defaults are used.
 */
export const publicConfigQuery = queryOptions({
  queryKey: ['settings', 'public'],
  queryFn: () => apiFetch<PublicConfig>('/settings/public'),
  staleTime: 5 * 60_000,
});

/** The public settings, never undefined: the registry defaults while loading. */
export function usePublicConfig(): PublicSettings {
  const { data } = useQuery(publicConfigQuery);
  return { ...PUBLIC_SETTING_DEFAULTS, ...data };
}

/**
 * Is a lesson or teacher held in our classroom: its own platform_classroom (the teacher's mode, as the
 * API resolved it), else the academy default; the field is absent in a payload cached before migration 490.
 */
export function usePlatformClassroom(flag: boolean | undefined): boolean {
  const academy = usePublicConfig().meeting_link_auto;
  return flag ?? academy;
}

/** joinWindow's third argument from the settings. */
export const useJoinWindow = (): JoinWindowConfig => joinWindowConfig(usePublicConfig());

/** settings.upload_max_mb in bytes. */
export const useUploadMaxBytes = (): number => uploadMaxBytes(usePublicConfig());
