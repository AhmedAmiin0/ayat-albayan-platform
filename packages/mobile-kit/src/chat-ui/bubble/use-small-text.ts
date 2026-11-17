import { type Palette, type, useTheme } from '../../theme';

/**
 * A bubble's small print (time, sender, a file's size): 2xs, tabular digits, in ink-2 (the staff
 * inbox) unless another ink is given (the student channel's ink-3).
 */
export function useSmallText(ink: keyof Palette = 'ink2') {
  const { color } = useTheme();
  return {
    fontFamily: type.ui[500],
    fontSize: type.size['2xs'],
    lineHeight: type.lineHeight(type.size['2xs']),
    color: color[ink],
    fontVariant: ['tabular-nums' as const],
  };
}
