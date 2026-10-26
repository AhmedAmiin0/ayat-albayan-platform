import { SETTING_FIELD_OF, type AcademySettings, type SettingKey, type SettingsMetaResponse } from '@ab/shared';
import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';

const SETTINGS = '/settings';
const META = '/config/meta';

export type SaveOutcome = 'saved' | 'moved' | 'invalid';

interface ValueSave {
  key: SettingKey;
  value: unknown;
}

const isObject = (v: unknown): v is object => typeof v === 'object' && v !== null;

/**
 * PATCH /settings answers with the settings, or with `{ saved, moved }` when the server moved a key
 * to its module page: a key listed in `moved` (or found invalid, `invalid`) was not written here.
 */
export function outcomeOf(key: SettingKey, answer: unknown): SaveOutcome {
  const lists = (name: string): unknown[] => {
    const list: unknown = isObject(answer) ? Reflect.get(answer, name) : undefined;
    return Array.isArray(list) ? list : [];
  };
  const names = (name: string) => lists(name).includes(key) || lists(name).includes(SETTING_FIELD_OF[key]);
  if (names('moved')) return 'moved';
  return names('invalid') ? 'invalid' : 'saved';
}

const SAVE_KEY = ['settings', 'value-save'] as const;

/** The keys being saved now: their rows say «جارٍ الحفظ…» on the second line. */
export function useSavingKeys(): SettingKey[] {
  return useMutationState({
    filters: { mutationKey: SAVE_KEY, status: 'pending' },
    select: (m) => (m.state.variables as ValueSave | undefined)?.key,
  }).filter((k): k is SettingKey => k !== undefined);
}

/** One key per save (docs/26b §2: per-row saves), never the whole form. */
export function useSaveValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: SAVE_KEY,
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
