// The settings registry (packages/shared/src/settings) owns the keys, defaults, validators and the
// camelCase ↔ snake_case map; the API re-exports them under their old names.
export { readSettings, SETTING_DEFAULTS, settingsChanges, type SettingKey } from '@ab/shared';
