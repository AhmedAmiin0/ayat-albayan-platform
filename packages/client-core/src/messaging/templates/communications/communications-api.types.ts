import type { CommsSource } from '@ab/settings';
import type { CommsSourceView, ParityView } from '@ab/shared';

export interface CommunicationsCalls {
  parity: () => Promise<ParityView>;
  setSource: (source: CommsSource) => Promise<CommsSourceView>;
}
