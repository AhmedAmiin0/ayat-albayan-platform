import {
  joinWindowConfig,
  PUBLIC_SETTING_DEFAULTS,
  uploadMaxBytes,
  type JoinWindowConfig,
  type PublicConfig,
  type PublicSettings,
} from '@ab/shared';
import { QueryClient, QueryClientContext, queryOptions, useQuery } from '@tanstack/react-query';
import { useContext } from 'react';
import { apiFetch } from './api';

/**
 * GET /settings/public: the academy settings the app's buttons follow — the classroom join window,
 * the makeup window, the upload limit. Kept 5 minutes; until it answers (or if it fails, offline)
 * the registry defaults are used, so nothing waits on it.
 */
export const publicConfigQuery = queryOptions({
  queryKey: ['settings', 'public'],
  queryFn: () => apiFetch<PublicConfig>('/settings/public'),
  staleTime: 5 * 60_000,
});

/** Used only where no QueryClientProvider is mounted (a row rendered on its own): never fetches. */
// gcTime Infinity: no garbage-collection timer is left behind when such a row unmounts.
const idleClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

/**
 * The public settings, never undefined: the registry defaults while loading. Outside a
 * QueryClientProvider it stays on the defaults instead of throwing.
 */
export function usePublicConfig(): PublicSettings {
  const client = useContext(QueryClientContext);
  const { data } = useQuery({ ...publicConfigQuery, enabled: client !== undefined }, client ?? idleClient);
  return { ...PUBLIC_SETTING_DEFAULTS, ...data };
}

/** joinWindow's third argument from the settings. */
export const useJoinWindow = (): JoinWindowConfig => joinWindowConfig(usePublicConfig());

/** settings.upload_max_mb in bytes. */
export const useUploadMaxBytes = (): number => uploadMaxBytes(usePublicConfig());
