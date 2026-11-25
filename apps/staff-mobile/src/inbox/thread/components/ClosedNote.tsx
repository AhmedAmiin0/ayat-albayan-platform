import { View } from 'react-native';
import { t, shape, type, useTheme, AppText } from '@ab/mobile-kit';

/** A number with no message yet must start with a template; the note is never cut. */
export function ClosedNote({ known }: { known: boolean }) {
  const { color } = useTheme();
  const text = known ? t.inbox.sessionClosed : t.inbox.newChat.firstTemplate;
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
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
