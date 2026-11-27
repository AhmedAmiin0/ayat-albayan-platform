import { joinWindowConfig, type JoinWindowConfig } from '@ab/schedule';
import { publicConfigCalls } from '@ab/client-core';
import {
  PUBLIC_CONFIG_QUERY_KEY,
  PUBLIC_CONFIG_STALE_MS,
  uploadMaxBytes,
  withPublicDefaults,
  type PublicSettings,
} from '@ab/settings';
import { QueryClient, QueryClientContext, queryOptions, useQuery } from '@tanstack/react-query';
import { use } from 'react';
import { apiFetch, apiSend } from '../http/api';

const calls = publicConfigCalls({ apiFetch, apiSend });

/**
 * GET /settings/public (no login): the academy settings the apps' buttons follow — the classroom
 * join window, the makeup window, the upload limit, the family chat. Kept 5 minutes; until it
 * answers (or if it fails, offline) the registry defaults are used, so nothing waits on it.
 */
export const publicConfigQuery = queryOptions({
  queryKey: PUBLIC_CONFIG_QUERY_KEY,
  queryFn: calls.get,
  staleTime: PUBLIC_CONFIG_STALE_MS,
});

/** Used only where no QueryClientProvider is mounted (a row rendered on its own): never fetches. */
// gcTime Infinity: no garbage-collection timer is left behind when such a row unmounts.
const idleClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

/**
 * The public settings, never undefined: the registry defaults while loading. Outside a
 * QueryClientProvider it stays on the defaults instead of throwing.
 */
export function usePublicConfig(): PublicSettings {
  const client = use(QueryClientContext);
  const options = { ...publicConfigQuery, enabled: client !== undefined };
  const { data } = useQuery(options, client ?? idleClient);
  return withPublicDefaults(data);
}

/**
 * Is a lesson or teacher held in our classroom: its own platform_classroom (the teacher's mode, as
 * the API resolved it), else the academy default; the field is absent in a payload cached before
 * migration 490.
 */
export function usePlatformClassroom(flag: boolean | undefined): boolean {
  const academy = usePublicConfig().meeting_link_auto;
  return flag ?? academy;
}

/** joinWindow's third argument from the settings. */
export const useJoinWindow = (): JoinWindowConfig => joinWindowConfig(usePublicConfig());

/** settings.upload_max_mb in bytes. */
export const useUploadMaxBytes = (): number => uploadMaxBytes(usePublicConfig());
