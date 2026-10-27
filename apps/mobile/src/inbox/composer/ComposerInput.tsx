import { WA_TEXT_MAX } from '@ab/shared';
import type { RefObject } from 'react';
import { TextInput } from 'react-native';
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

/**
 * The free-text box inside the pill (the pill draws the border): grows with the text up to ~5 lines
 * (120pt), then scrolls inside itself. One line is the 44pt touch height with the pill's border: an
 * Arabic line height (26) + 8 + 8 padding + 2 × 1pt. No textAlign: the text runs the way it is typed.
 * Owner 2026-10-27: the text and the placeholder sit in the middle of the box (Android puts a multiline
 * input's text at the top) and keep 12pt from the pill's rounded inline-start edge.
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
        paddingVertical: 8,
        textAlignVertical: 'center',
        includeFontPadding: false,
        color: color.ink,
        fontFamily: type.ui[400],
        fontSize: type.size.base,
        lineHeight: type.lineHeight(type.size.base),
      }}
    />
  );
}
