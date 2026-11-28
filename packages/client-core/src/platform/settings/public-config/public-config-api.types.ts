import type { PublicConfig } from '@ab/settings';

export interface PublicConfigCalls {
  get: () => Promise<PublicConfig>;
}
