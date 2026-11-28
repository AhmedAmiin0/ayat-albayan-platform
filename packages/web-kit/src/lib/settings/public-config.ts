import { joinWindowConfig, type JoinWindowConfig } from '@ab/schedule';
import { publicConfigCalls } from '@ab/client-core';
import {
  PUBLIC_CONFIG_QUERY_KEY,
  PUBLIC_CONFIG_STALE_MS,
  uploadMaxBytes,
  withPublicDefaults,
  type PublicSettings,
} from '@ab/settings';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';

const calls = publicConfigCalls({ apiFetch, apiSend });

/**
 * GET /settings/public (no login): the academy settings every screen may read — the classroom join
 * window, the makeup window, the upload limit, the academy's WhatsApp. Kept 5 minutes; the admin's
 * save invalidates it. Until it answers (or if it fails) the registry defaults are used.
 */
export const publicConfigQuery = queryOptions({
  queryKey: PUBLIC_CONFIG_QUERY_KEY,
  queryFn: calls.get,
  staleTime: PUBLIC_CONFIG_STALE_MS,
});

/** The public settings, never undefined: the registry defaults while loading. */
export function usePublicConfig(): PublicSettings {
  const { data } = useQuery(publicConfigQuery);
  return withPublicDefaults(data);
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
