import type { ForwardResponse, ThreadForward } from '@ab/shared';

export interface ThreadForwardCalls {
  forward: (body: ThreadForward) => Promise<ForwardResponse>;
}
