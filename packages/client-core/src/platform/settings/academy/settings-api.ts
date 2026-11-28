import { settingsRoutes } from '@ab/settings';
import { callWith, type ApiClient } from '../../../core/http';
import type { SettingsCalls } from './settings-api.types';

/** The academy settings (admin), on one api client; a write changes only the fields sent. */
export function settingsCalls(client: ApiClient): SettingsCalls {
  const call = callWith(client);
  return {
    view: () => call({ route: settingsRoutes.view }),
    update: (body) => call({ route: settingsRoutes.update, body }),
  };
}
