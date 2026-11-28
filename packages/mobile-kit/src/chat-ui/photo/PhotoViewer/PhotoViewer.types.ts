import type { ReactNode } from 'react';

export interface PhotoViewerProps {
  uri: string;
  /** Its kind and caption, for the screen reader. */
  label: string;
  footer?: ReactNode;
  onClose: () => void;
}
