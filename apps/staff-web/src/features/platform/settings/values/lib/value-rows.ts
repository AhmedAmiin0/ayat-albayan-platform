import { GOOGLE_SETTING_KEYS, settingDef, type AcademySettings, type CustomConfigView, type GoogleSyncSettings, type SettingKey } from '@ab/shared';
import { settingText } from '@/components/settings/search/setting-text';
import { matchesSetting, matchesText } from '@/components/settings/search/settings-search';
import { t } from '@/lib/i18n/i18n';
import { isModified } from '@/features/platform/settings/registry-form/row-form';
import { GROUP_IDS, groupKeys, isOwnedGroup, type ValuesGroupId } from './value-groups-view';
import type { ValuesFilter } from '@/features/platform/settings/values/values-search';

// The rows of «القيم»: settings rows (editable or module-owned), the three Google values (not
// settings rows: google_settings via /admin/google/status) and the custom entries.

export type GoogleField = keyof typeof GOOGLE_SETTING_KEYS;

export type ValueRow =
  | { kind: 'setting'; key: SettingKey; group: ValuesGroupId; owned: boolean }
  | { kind: 'google'; field: GoogleField; group: 'google' }
  | { kind: 'custom'; entry: CustomConfigView; group: 'custom' };

/** The seeded Google values (migration 20261022000610). */
export const GOOGLE_DEFAULTS: GoogleSyncSettings = { enabled: false, mode: 'dry_run', window_days: 60 };
const GOOGLE_FIELDS: readonly GoogleField[] = ['enabled', 'mode', 'window_days'];
const gs = t.googleSync.switches;
const GOOGLE_WORDS: Record<GoogleField, { label: string; hint: string }> = {
  enabled: { label: gs.enabled, hint: gs.enabledHint },
  mode: { label: gs.mode, hint: gs.dryRunHint },
  window_days: { label: gs.window, hint: gs.windowHint },
};

/** A row's stable id: the settings key, the Google row key or the custom key. */
export function rowKey(row: ValueRow): string {
  if (row.kind === 'setting') return row.key;
  if (row.kind === 'google') return GOOGLE_SETTING_KEYS[row.field];
  return row.entry.key;
}

/** What a row is called and the one muted line under it. */
export function rowWords(row: ValueRow): { label: string; hint?: string | undefined } {
  if (row.kind === 'setting') return settingText(row.key);
  if (row.kind === 'google') return GOOGLE_WORDS[row.field];
  return row.entry.description ? { label: row.entry.description } : { label: row.entry.key };
}

/** The rows of one group, in list order. */
export function groupRows(group: ValuesGroupId, custom: readonly CustomConfigView[]): ValueRow[] {
  if (group === 'custom') return custom.map((entry) => ({ kind: 'custom', entry, group }));
  if (group === 'google') return GOOGLE_FIELDS.map((field) => ({ kind: 'google', field, group }));
  return groupKeys(group).map((key) => ({ kind: 'setting', key, group, owned: isOwnedGroup(group) }));
}

export interface RowQuery {
  q: string;
  filter?: ValuesFilter | undefined;
  settings: AcademySettings;
  google?: GoogleSyncSettings | undefined;
}

function modified(row: ValueRow, query: RowQuery): boolean {
  if (row.kind === 'setting') return isModified(row.key, query.settings);
  if (row.kind === 'google') return query.google !== undefined && query.google[row.field] !== GOOGLE_DEFAULTS[row.field];
  return false;
}

function isPublic(row: ValueRow): boolean {
  if (row.kind === 'setting') return settingDef(row.key).public === true;
  return row.kind === 'custom' && row.entry.isPublic;
}

/**
 * Does the row match the search and the filter? A settings row matches as the hub search does
 * (label, hint, the switch words of a number that can be OFF, key), so a hub hit lands on its row.
 */
export function rowMatches(row: ValueRow, query: RowQuery): boolean {
  if (query.filter === 'modified' && !modified(row, query)) return false;
  if (query.filter === 'public' && !isPublic(row)) return false;
  if (row.kind === 'setting') return matchesSetting(row.key, query.q);
  const words = rowWords(row);
  const text = [words.label, words.hint, rowKey(row), row.kind === 'custom' ? row.entry.description : ''].filter(Boolean).join(' ');
  return matchesText(text, query.q);
}

/** «الكل»: the matches from every group, in list order. */
export function allRows(custom: readonly CustomConfigView[], query: RowQuery): ValueRow[] {
  return GROUP_IDS.flatMap((g) => groupRows(g, custom)).filter((row) => rowMatches(row, query));
}

/** The page head's counts over the editable values («28 قيمة · 5 معدَّلة · 8 عامة»). */
export function valueCounts(settings: AcademySettings): { total: number; modified: number; public: number } {
  const keys = GROUP_IDS.filter((g) => !isOwnedGroup(g)).flatMap(groupKeys);
  return {
    total: keys.length,
    modified: keys.filter((k) => isModified(k, settings)).length,
    public: keys.filter((k) => settingDef(k).public === true).length,
  };
}
