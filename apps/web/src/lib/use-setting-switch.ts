import type { AcademySettings } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CONFIG_QUERY_KEYS } from './query-keys';
import { updateSettings } from './settings-api';

export interface SettingSwitchOptions {
  /** After the new settings are in the cache: close a dialog, refresh what depends on them. */
  onSaved?: (next: AcademySettings) => Promise<void> | void;
}

/**
 * A setting that saves on its own (the sending switch, automatic messages, feedback mode, sales
 * auto-assign): one PATCH /settings, then the answer replaces ['settings'] in the cache.
 */
export function useSettingSwitch(opts: SettingSwitchOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: async (next) => {
      queryClient.setQueryData(CONFIG_QUERY_KEYS.settings, next);
      await opts.onSaved?.(next);
    },
  });
}
