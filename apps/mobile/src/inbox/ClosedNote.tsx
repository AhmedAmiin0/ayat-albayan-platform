import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';

/**
 * In the reply box's place once the 24 h window closed: why only a template can go now
 * (inbox.sessionClosed, verbatim; a number with no message yet: the first message is a template).
 * One gold-washed line as tall as the box, beside «أرسل قالبًا»: two lines at most, three for a new
 * number (its longer note must fit a 360dp phone whole).
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
        numberOfLines={known ? 2 : 3}
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
