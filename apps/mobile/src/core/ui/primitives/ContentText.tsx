import { textDir } from '@ab/shared';
import type { ComponentProps } from 'react';
import { I18nManager } from 'react-native';
import { AppText } from './AppText';

type ContentTextProps = ComponentProps<typeof AppText> & {
  /** The user-authored text whose first strong letter decides the side (usually the children). */
  source: string;
};

/**
 * User-authored text (a message, a note, a name) aligned by its own language, like WhatsApp: English
 * in the Arabic UI sits on the left, Arabic in the English UI on the right; digits only stay at the
 * start. 'left'/'right' are swapped by RN in RTL, so 'left' = start. No writingDirection (Android
 * ignores it). A caller style still wins.
 */
export function ContentText({ source, style, ...props }: ContentTextProps) {
  const ui = I18nManager.isRTL ? 'rtl' : 'ltr';
  const textAlign = (textDir(source) ?? ui) === ui ? 'left' : 'right';
  return <AppText {...props} style={[{ textAlign }, style]} />;
}
