import { type, useTheme } from '@/theme';

/** One quiet line under or over the reply box (LineNote, GateNote, the window's end): 2xs ink-2. */
export function useNoteStyle() {
  const { color } = useTheme();
  return {
    fontFamily: type.ui[500],
    fontSize: type.size['2xs'],
    lineHeight: type.lineHeight(type.size['2xs']),
    color: color.ink2,
  };
}
