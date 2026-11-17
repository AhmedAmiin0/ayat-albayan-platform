import { View } from 'react-native';
import { t, type, useTheme, AppText } from '@ab/mobile-kit';

/** The unread count (ChatXTeacherList): a 22pt brand pill with the number only. */
export function CountBadge({ n }: { n: number }) {
  const { color } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={t.studentChannel.unread.replace('{n}', String(n))}
      style={{
        minWidth: 22,
        height: 22,
        paddingHorizontal: 6,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color.lapisFill,
      }}
    >
      <AppText
        style={{ fontFamily: type.ui[700], fontSize: type.size['2xs'], color: color.onLapis }}
      >
        {String(n)}
      </AppText>
    </View>
  );
}
