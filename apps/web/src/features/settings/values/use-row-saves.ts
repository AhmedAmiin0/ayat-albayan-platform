import type { SettingKey, SettingsUpdate } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { CONFIG_QUERY_KEYS } from '@/lib/query-keys';
import { updateSettings } from '@/lib/settings-api';
import { serverMessage, wasMoved } from './save-result';

export type RowStatus =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'failed'; message?: string | undefined }
  | { state: 'moved' };
export type SaveEnd = 'saved' | 'moved' | 'failed';

const IDLE: RowStatus = { state: 'idle' };

export interface RowSaves {
  status: (key: SettingKey) => RowStatus;
  /** One PATCH /settings with this one key; rows save independently of each other. */
  run: (key: SettingKey, body: SettingsUpdate) => Promise<SaveEnd>;
}

/**
 * Each row's own save (docs/26b §2): its status lives per key, so saving row A never touches row
 * B, and it outlives a group switch. On success the settings, «آخر تعديل» and the public config
 * are refetched (the answer is never written into the cache: its shape is changing, 26-P0).
 */
export function useRowSaves(): RowSaves {
  const queryClient = useQueryClient();
  const [statuses, setStatuses] = useState<Partial<Record<SettingKey, RowStatus>>>({});
  const set = useCallback((key: SettingKey, s: RowStatus) => setStatuses((all) => ({ ...all, [key]: s })), []);
  const run = useCallback(
    async (key: SettingKey, body: SettingsUpdate): Promise<SaveEnd> => {
      set(key, { state: 'saving' });
      try {
        const res: unknown = await updateSettings(body);
        if (wasMoved(res, key)) {
          set(key, { state: 'moved' });
          return 'moved';
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: CONFIG_QUERY_KEYS.settings }),
          queryClient.invalidateQueries({ queryKey: CONFIG_QUERY_KEYS.settingsMeta }),
          queryClient.invalidateQueries({ queryKey: CONFIG_QUERY_KEYS.publicConfig }),
        ]);
        set(key, IDLE);
        return 'saved';
      } catch (error) {
        set(key, { state: 'failed', message: serverMessage(error) });
        return 'failed';
      }
    },
    [queryClient, set],
  );
  return { status: (key) => statuses[key] ?? IDLE, run };
}
