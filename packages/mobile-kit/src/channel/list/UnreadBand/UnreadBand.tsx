import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';

/** Over the first message unread when the thread opened. */
export function UnreadBand({ count }: { count: number }) {
  const { color } = useTheme();
  return (
    <AppText
      testID="channel-unread-band"
      style={{
        marginTop: 8,
        marginBottom: 4,
        marginHorizontal: -16,
        paddingVertical: 4,
        backgroundColor: color.lapisWash,
        textAlign: 'center',
        fontFamily: type.ui[600],
        fontSize: type.size['2xs'],
        lineHeight: type.lineHeight(type.size['2xs']),
        color: color.lapis,
      }}
    >
      {t.studentChannel.unread.replace('{n}', String(count))}
    </AppText>
  );
}
