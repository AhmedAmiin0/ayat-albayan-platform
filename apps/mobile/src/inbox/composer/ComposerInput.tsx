import { WA_TEXT_MAX } from '@ab/shared';
import type { RefObject } from 'react';
import { Platform, TextInput } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';

export interface Selection {
  start: number;
  end: number;
}

interface ComposerInputProps {
  value: string;
  onChange: (text: string) => void;
  onBlur?: () => void;
  /** Where the caret is: an emoji goes in there. */
  onSelection?: (sel: Selection) => void;
  inputRef?: RefObject<TextInput | null>;
}

/** One line's padding and height (owner 2026-11-01: «Message» and the caret sat high). */
interface InputLine {
  paddingVertical: number;
  lineHeight?: number;
}

/**
 * Android lays the placeholder and an empty box's caret out on the font's own line (Noto Sans
 * Arabic: 2.11 em, 34pt at 16pt) and centres only a line that fits: a 26pt lineHeight in a 26pt
 * content box left them at the top. There the line keeps the font's height and the padding is
 * 4 + 4, so text, placeholder and caret share one centred 34pt line in the 42pt box; iOS keeps
 * 26 + 8 + 8.
 */
const LINES: Record<'android' | 'other', InputLine> = {
  android: { paddingVertical: 4 },
  other: { paddingVertical: 8, lineHeight: type.lineHeight(type.size.base) },
};

export const inputLine = (os: string): InputLine => LINES[os === 'android' ? 'android' : 'other'];

/**
 * The free-text box inside the pill (the pill draws the border): grows with the text up to ~5 lines
 * (120pt), then scrolls inside itself. One line is the 44pt touch height with the pill's border
 * (inputLine) + 2 × 1pt. No textAlign: the text runs the way it is typed. Owner 2026-10-27: the
 * text and the placeholder sit in the middle of the box and keep 12pt from the pill's inline start.
 */
export function ComposerInput({ value, onChange, onBlur, onSelection, inputRef }: ComposerInputProps) {
  const { color } = useTheme();
  return (
    <TextInput
      ref={inputRef}
      multiline
      value={value}
      maxLength={WA_TEXT_MAX}
      onChangeText={onChange}
      onBlur={onBlur}
      onSelectionChange={(e) => onSelection?.(e.nativeEvent.selection)}
      accessibilityLabel={t.inbox.composer.placeholder}
      placeholder={t.inbox.composer.placeholder}
      placeholderTextColor={color.ink3}
      style={{
        flex: 1,
        minHeight: shape.control.touch - 2,
        maxHeight: 120,
        paddingStart: 12,
        paddingEnd: 4,
        textAlignVertical: 'center',
        includeFontPadding: false,
        color: color.ink,
        fontFamily: type.ui[400],
        fontSize: type.size.base,
        ...inputLine(Platform.OS),
      }}
    />
  );
}
