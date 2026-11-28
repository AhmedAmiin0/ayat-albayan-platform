import { palette, type } from '../../../theme';
import { PDF_LINE } from '../use-current-page';

export const NAME = {
  ...PDF_LINE,
  fontFamily: type.ui[600],
  fontSize: type.size.sm,
  color: palette.dark.ink,
};
