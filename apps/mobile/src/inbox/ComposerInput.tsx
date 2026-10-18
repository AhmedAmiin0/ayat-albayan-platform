import { WA_TEXT_MAX } from '@ab/shared';
import { TextInput } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';

/**
 * The free-text box: grows with the text up to ~5 lines (120pt), then scrolls inside itself. One
 * line is exactly the 44pt touch height: an Arabic line height (26) + 8 + 8 padding + the 1pt border.
 */
export function ComposerInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const { color } = useTheme();
  return (
    <TextInput
      multiline
      value={value}
      maxLength={WA_TEXT_MAX}
      onChangeText={onChange}
      accessibilityLabel={t.inbox.composer.placeholder}
      placeholder={t.inbox.composer.placeholder}
      placeholderTextColor={color.ink3}
      style={{
        flex: 1,
        minHeight: shape.control.touch,
        maxHeight: 120,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: color.ruleInput,
        borderRadius: shape.radius.lg + 10,
        backgroundColor: color.raised,
        color: color.ink,
        fontFamily: type.ui[400],
        fontSize: type.size.base,
        lineHeight: type.lineHeight(type.size.base),
        textAlign: 'left',
      }}
    />
  );
}
