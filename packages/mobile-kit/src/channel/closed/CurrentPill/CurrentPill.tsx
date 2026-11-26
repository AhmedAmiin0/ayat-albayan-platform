import { t } from '../../../lib/i18n/i18n';
import { shape, type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';

export function CurrentPill() {
  const { color } = useTheme();
  return (
    <AppText
      style={{
        paddingHorizontal: 8,
        borderRadius: shape.radius.pill,
        overflow: 'hidden',
        backgroundColor: color.lapisWash,
        color: color.lapis,
        fontFamily: type.ui[600],
        fontSize: type.size['2xs'],
        lineHeight: 19,
      }}
    >
      {t.studentChannel.closedCard.current}
    </AppText>
  );
}
