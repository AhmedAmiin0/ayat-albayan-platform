import type { MessageHideParams } from '@ab/shared';

export interface MessageHideCalls {
  hide: (target: MessageHideParams) => Promise<void>;
  unhide: (target: MessageHideParams) => Promise<void>;
}
