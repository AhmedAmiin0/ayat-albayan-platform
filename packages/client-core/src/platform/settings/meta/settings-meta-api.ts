import { settingsMetaRoutes } from '@ab/settings';
import { callWith, type ApiClient } from '../../../core/http';
import type { SettingsMetaCalls } from './settings-meta-api.types';

/** Who last changed each stored setting, on one api client. */
export function settingsMetaCalls(client: ApiClient): SettingsMetaCalls {
  const call = callWith(client);
  return {
    view: () => call({ route: settingsMetaRoutes.view }),
  };
}
