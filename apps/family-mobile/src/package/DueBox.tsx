import type { PortalAmount } from '@ab/shared';
import { View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { amountText } from './package-text';

/** Shown only when something is owed. */
export function DueBox({ due }: { due: PortalAmount }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        backgroundColor: color.actSoft,
      }}
    >
      <AppText style={{ fontFamily: type.ui[600], color: color.act }}>{t.portal.amountDue}</AppText>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.lg, color: color.act }}>
        {amountText(due)}
      </AppText>
    </View>
  );
}
