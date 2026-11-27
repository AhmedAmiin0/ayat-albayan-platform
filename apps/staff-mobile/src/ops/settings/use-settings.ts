import { settingsCalls } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

const calls = settingsCalls({ apiFetch, apiSend });

/** Values save one key at a time. */
export function useSettings() {
  return useQuery({ queryKey: pathKey('/settings'), queryFn: () => calls.view() });
}
