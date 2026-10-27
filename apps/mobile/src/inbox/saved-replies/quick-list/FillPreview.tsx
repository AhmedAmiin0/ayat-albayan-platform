import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

/** «شكل الرد»: the text as it will go into the box, updated with every keystroke. */
export function FillPreview({ text }: { text: string }) {
  const { color } = useTheme();
  return (
    <View
      accessibilityLabel={`${t.savedReplies.fill.preview}: ${text}`}
      accessible
      style={{ gap: 4, padding: 12, borderRadius: shape.radius.md, borderWidth: 1, borderColor: color.rule, backgroundColor: color.lapisWash }}
    >
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs, true), color: color.ink2 }}>
        {t.savedReplies.fill.preview}
      </AppText>
      <AppText
        testID="fill-reply-preview"
        style={{ fontFamily: type.ui[400], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink, writingDirection: 'auto' }}
      >
        {text}
      </AppText>
    </View>
  );
}
