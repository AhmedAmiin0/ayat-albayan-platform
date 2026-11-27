import { View } from 'react-native';
import { AppText } from '../../../../ui/primitives/AppText';
import { Mark } from '../../../../ui/primitives/Mark';
import { type, useTheme } from '../../../../theme';

/** The academy's mark, the title in Noto Sans Arabic 700 and one line under it (staff /login). */
export function MarkHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { color } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <Mark size={56} labelled />
      <AppText
        accessibilityRole="header"
        style={{
          fontFamily: type.display,
          fontSize: type.size.h2,
          lineHeight: type.lineHeight(type.size.h2, true),
          color: color.ink,
          textAlign: 'center',
        }}
      >
        {title}
      </AppText>
      {subtitle ? (
        <AppText style={{ color: color.ink2, textAlign: 'center' }}>{subtitle}</AppText>
      ) : null}
    </View>
  );
}
