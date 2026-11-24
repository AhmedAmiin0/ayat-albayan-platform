import type { AcademySettings, ConfigEntry, SettingKey, SettingMeta } from '@ab/settings';
import type { SettingsForm } from '@/features/platform/settings/registry-form/settings-form';
import type { DescribeTarget } from '@/features/platform/settings/values/description/describe-target';
import type { ConfirmKind } from '@/features/platform/settings/values/sheet/value-confirm';
import type { RowStatus } from './use-row-saves';
import type { ValueDrafts } from './use-value-drafts';

export interface PendingConfirm {
  key: SettingKey;
  kind: ConfirmKind;
  value: unknown;
  /** The version to send when keeping the admin's value after a conflict. */
  version?: number | undefined;
}

/** The last saved row, for the toast's undo (it re-saves `prev`). */
export interface SavedNote {
  key: SettingKey;
  prev: AcademySettings[SettingKey];
  id: number;
}

/** Per key, the value a save in this visit replaced and when that save landed. */
export interface HistoryEntry {
  prev: AcademySettings[SettingKey];
  at: number;
}
export type History = Partial<Record<SettingKey, HistoryEntry>>;

export interface ValuesApi {
  settings: AcademySettings;
  meta: Record<string, SettingMeta>;
  canWrite: boolean;
  drafts: ValueDrafts;
  status: (key: SettingKey) => RowStatus;
  /** The validation line of a dirty row (live, before any save). */
  error: (key: SettingKey) => string | undefined;
  /** Validates the row, asks first when the registry says so, then saves it alone. */
  save: (key: SettingKey) => void;
  apply: (key: SettingKey, form: SettingsForm) => void;
  /** The value the last save replaced, only if it was saved in this visit. */
  previous: (key: SettingKey) => { value: AcademySettings[SettingKey] } | undefined;
  /** When this key last saved (the phone sheet closes on a new one). */
  savedAt: (key: SettingKey) => number | undefined;
  announce: (message: string) => void;
  /** Conflict: save the edit again over the newer version, or drop the edit. */
  keepMine: (key: SettingKey) => void;
  takeTheirs: (key: SettingKey) => void;
  /** The key's row of GET /config/entries, once read. */
  entry: (key: string) => ConfigEntry | undefined;
  describe: (target: DescribeTarget) => void;
}

export interface ControllerInput {
  settings: AcademySettings;
  meta: Record<string, SettingMeta>;
  canWrite: boolean;
  entries: readonly ConfigEntry[];
  describe: (target: DescribeTarget) => void;
}
