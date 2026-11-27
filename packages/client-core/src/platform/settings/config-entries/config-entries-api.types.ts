import type { ConfigEntriesResponse, ConfigEntryPatchInput, ConfigEntryResult } from '@ab/settings';

export interface ConfigEntryPatch {
  key: string;
  body: ConfigEntryPatchInput;
}

/** `text: null` restores the seeded text. */
export interface ConfigDescriptionSave {
  key: string;
  text: string | null;
}

export interface ConfigEntryCalls {
  list: () => Promise<ConfigEntriesResponse>;
  patch: (input: ConfigEntryPatch) => Promise<ConfigEntryResult>;
  describe: (input: ConfigDescriptionSave) => Promise<ConfigEntryResult>;
}
