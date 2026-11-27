import type { Ref } from 'react';
import type { View } from 'react-native';

export interface InlineConfirmProps {
  message: string;
  /** Named by its verb; defaults to confirm. */
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** While the confirm request runs; pass the confirm label that says so. */
  busy?: boolean;
  /**
   * «danger»: the confirm cancels or deletes something, so it is the outlined danger, not green.
   * «secondary»: a filled button already leads the section, so the confirm is outlined.
   */
  tone?: 'danger' | 'secondary';
  /** The confirm button, e.g. to move screen-reader focus to it on open. */
  confirmRef?: Ref<View>;
}
