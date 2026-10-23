import { SETTING_FIELD_OF, type AcademySettings, type SettingKey, type SettingsMetaResponse } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';

const SETTINGS = '/settings';
const META = '/config/meta';

export type SaveOutcome = 'saved' | 'moved';

export interface ValueSave {
  key: SettingKey;
  value: unknown;
}

const isObject = (v: unknown): v is object => typeof v === 'object' && v !== null;

/**
 * PATCH /settings answers with the settings, or with `{ saved, moved }` when the server moved a key
 * to its module page: a key listed in `moved` was not written here.
 */
export function outcomeOf(key: SettingKey, answer: unknown): SaveOutcome {
  const moved: unknown = isObject(answer) ? Reflect.get(answer, 'moved') : undefined;
  const names: unknown[] = Array.isArray(moved) ? moved : [];
  return names.includes(key) || names.includes(SETTING_FIELD_OF[key]) ? 'moved' : 'saved';
}

/** One key per save (docs/26b §2: per-row saves), never the whole form. */
export function useSaveValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: ValueSave) => {
      const answer = await apiSend<unknown>('PATCH', SETTINGS, { [SETTING_FIELD_OF[key]]: value });
      return { outcome: outcomeOf(key, answer), answer };
    },
    onSuccess: ({ answer }, { key }) => {
      // The settings object replaces the cached copy; any other answer refetches it.
      if (isObject(answer) && Object.hasOwn(answer, key)) {
        qc.setQueryData(pathKey(SETTINGS), answer as AcademySettings);
      } else void qc.invalidateQueries({ queryKey: pathKey(SETTINGS) });
      void qc.invalidateQueries({ queryKey: pathKey(META) });
    },
  });
}

/** GET /config/meta («آخر تعديل»); the sheet leaves the line out when it fails or is missing. */
export function useConfigMeta() {
  return useQuery({
    queryKey: pathKey(META),
    queryFn: () => apiFetch<SettingsMetaResponse>(META),
    retry: false,
  });
}
