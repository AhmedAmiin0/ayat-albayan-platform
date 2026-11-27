import { View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import type { InstructionsProps } from './Instructions.types';

/** The academy's transfer text and what happens after it (empty setting: nothing). */
export function Instructions({ text }: InstructionsProps) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
        {t.portal.paymentInstructions}
      </AppText>
      <AppText
        selectable
        style={{ padding: 12, borderRadius: 12, backgroundColor: color.sunk, color: color.ink2 }}
      >
        {text}
      </AppText>
      <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>
        {t.portal.app.package.afterTransfer}
      </AppText>
    </View>
  );
}
