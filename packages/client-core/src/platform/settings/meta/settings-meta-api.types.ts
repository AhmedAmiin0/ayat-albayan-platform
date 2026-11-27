import type { SettingsMetaResponse } from '@ab/settings';

export interface SettingsMetaCalls {
  view: () => Promise<SettingsMetaResponse>;
}
