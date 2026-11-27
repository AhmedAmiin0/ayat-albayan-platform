import type { AskTimeBodyProps } from './AskTimeBody';

export interface AskTimeSheetProps extends AskTimeBodyProps {
  open: boolean;
  onClose: () => void;
}
