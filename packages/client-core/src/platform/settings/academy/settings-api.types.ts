import type { AcademySettings, SettingsPatchBody, SettingsPatchResult } from '@ab/settings';

export interface SettingsCalls {
  view: () => Promise<AcademySettings>;
  update: (body: SettingsPatchBody) => Promise<SettingsPatchResult>;
}
