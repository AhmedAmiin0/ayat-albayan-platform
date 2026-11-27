import { type, useTheme } from '../../../theme';
import { AppText } from '../../primitives/AppText';
import type { NoteProps } from './Note.types';

/** `alert` lines replace what was just done and are announced by the screen reader. */
export function Note({ children, alert = false }: NoteProps) {
  const { color } = useTheme();
  return (
    <AppText
      accessibilityRole={alert ? 'alert' : undefined}
      style={{
        fontFamily: type.ui[400],
        fontSize: type.size.xs,
        lineHeight: type.lineHeight(type.size.xs),
        color: color.ink3,
      }}
    >
      {children}
    </AppText>
  );
}
