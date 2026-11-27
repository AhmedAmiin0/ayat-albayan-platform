import type { LineCheckView } from '@ab/shared';

export interface LineCheckCalls {
  check: () => Promise<LineCheckView[]>;
}
