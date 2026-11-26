import type { ThreadView } from '@ab/shared';

export interface QuoteDialogProps {
  thread: ThreadView;
  onClose: () => void;
  onFilled: () => void;
}
