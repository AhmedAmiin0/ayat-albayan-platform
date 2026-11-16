import { type, useTheme } from '../../theme';

/** A bubble's small print (time, sender, a file's size): 2xs, ink-2, tabular digits. */
export function useSmallText() {
  const { color } = useTheme();
  return {
    fontFamily: type.ui[500],
    fontSize: type.size['2xs'],
    lineHeight: type.lineHeight(type.size['2xs']),
    color: color.ink2,
    fontVariant: ['tabular-nums' as const],
  };
}
