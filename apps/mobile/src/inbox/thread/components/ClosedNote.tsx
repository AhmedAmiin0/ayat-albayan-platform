import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

/**
 * In the reply box's place once the 24 h window closed: why only a template can go now
 * (inbox.sessionClosed, verbatim; a number with no message yet: the first message is a template).
 * A gold-washed note at least as tall as the box, beside «أرسل قالبًا». Never cut (owner 2026-10-27):
 * no line limit, it wraps and the row grows; the short copy fits a 360dp phone at a large font in
 * two lines.
 */
export function ClosedNote({ known }: { known: boolean }) {
  const { color } = useTheme();
  const text = known ? t.inbox.sessionClosed : t.inbox.newChat.firstTemplate;
  return (
    <View
      style={{
        flex: 1,
        minHeight: shape.control.touch,
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: shape.radius.md,
        backgroundColor: color.goldWash,
      }}
    >
      <AppText
        testID="closed-note"
        accessibilityLabel={text}
        style={{
          fontFamily: type.ui[500],
          fontSize: type.size['2xs'],
          lineHeight: type.lineHeight(type.size['2xs']),
          color: color.ink,
        }}
      >
        {text}
      </AppText>
    </View>
  );
}
