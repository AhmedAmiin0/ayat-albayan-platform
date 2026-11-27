import type { CustomConfigUpsertInput, CustomConfigView } from '@ab/settings';

export interface CustomConfigSave {
  key: string;
  body: CustomConfigUpsertInput;
}

export interface CustomConfigCalls {
  list: () => Promise<CustomConfigView[]>;
  put: (input: CustomConfigSave) => Promise<CustomConfigView>;
  remove: (key: string) => Promise<void>;
}
